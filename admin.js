// The admin side of worker.js: saves orders and contact requests to the D1
// database (photos go to the R2 bucket), and serves /api/admin/* for the admin
// page at /admin. Cloudflare only; the Railway server (server.js) doesn't have it.
//
// Settings (Cloudflare dashboard > Workers & Pages > brads-bees > Settings > Variables and Secrets,
// or .dev.vars when testing locally):
//   ADMIN_PASSWORD - secret, the password Brad types on /admin/login
//   SESSION_SECRET - secret, a long random string used to sign the login cookie
// Bindings (wrangler.jsonc): DB (D1 database), PHOTOS (R2 bucket)

import { CONTENT_KEYS, readContent, saveImage, validateContent } from './content.js'

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers })

/* =========================================================
   Saving submissions (called from worker.js)
   ========================================================= */

const cents = (dollars) => Math.round(dollars * 100)

// order: { buyer, lines: [{ product, qty }], subtotal, shipping, total } from buildOrderEmail
export async function saveOrder(env, { buyer, lines, subtotal, shipping, total }) {
  const row = await env.DB.prepare(
    `INSERT INTO orders (name, email, phone, address, city, state, zip, notes, subtotal_cents, shipping_cents, total_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(buyer.name, buyer.email, buyer.phone, buyer.address, buyer.city, buyer.state, buyer.zip, buyer.notes, cents(subtotal), cents(shipping), cents(total))
    .first()

  const label = (product) => (product.variant ? `${product.name} (${product.variant})` : product.name)
  await env.DB.batch(
    lines.map(({ product, qty }) =>
      env.DB.prepare('INSERT INTO order_items (order_id, product_id, label, price_cents, qty) VALUES (?, ?, ?, ?, ?)')
        .bind(row.id, product.id, label(product), cents(product.price), qty),
    ),
  )
  return row.id
}

// contact from buildContactEmail; photos: [{ filename, content, contentType }]
export async function saveRequest(env, contact, photos = []) {
  const row = await env.DB.prepare(
    'INSERT INTO requests (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?) RETURNING id',
  )
    .bind(contact.name, contact.email, contact.phone, contact.service, contact.message)
    .first()

  if (env.PHOTOS && photos.length) {
    const saved = []
    for (const [n, photo] of photos.entries()) {
      const safeName = photo.filename.replace(/[^\w.-]+/g, '_').slice(-80) || 'photo'
      const key = `requests/${row.id}/${n + 1}-${safeName}`
      await env.PHOTOS.put(key, photo.content, { httpMetadata: { contentType: photo.contentType } })
      saved.push({ key, ...photo })
    }
    await env.DB.batch(
      saved.map(({ key, filename, contentType, content }) =>
        env.DB.prepare('INSERT INTO request_photos (request_id, r2_key, filename, content_type, size) VALUES (?, ?, ?, ?, ?)')
          .bind(row.id, key, filename, contentType, content.byteLength),
      ),
    )
  }
  return row.id
}

/* =========================================================
   Login: one password, then a signed cookie
   ========================================================= */

const COOKIE = 'bb_admin'
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000 // "Keep me signed in": 30 days
const SESSION_MS = 12 * 60 * 60 * 1000 // otherwise: until the browser closes, at most 12 hours

const encoder = new TextEncoder()

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

// Compares without leaking how many characters matched
async function sameText(a, b) {
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(a)), crypto.subtle.digest('SHA-256', encoder.encode(b))])
  const x = new Uint8Array(ha)
  const y = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

async function makeSession(env, remember) {
  const expires = Date.now() + (remember ? REMEMBER_MS : SESSION_MS)
  const value = `v1.${expires}`
  return { token: `${value}.${await sign(env.SESSION_SECRET, value)}`, expires }
}

async function isSignedIn(request, env) {
  if (!env.SESSION_SECRET) return false
  const cookie = request.headers.get('Cookie') ?? ''
  const token = cookie.split(/;\s*/).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!token) return false
  const [version, expires, signature] = token.split('.')
  if (version !== 'v1' || !(Number(expires) > Date.now()) || !signature) return false
  return sameText(signature, await sign(env.SESSION_SECRET, `${version}.${expires}`))
}

function sessionCookie(token, maxAgeSeconds) {
  const age = maxAgeSeconds === undefined ? '' : `; Max-Age=${maxAgeSeconds}`
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict${age}`
}

// A handful of wrong passwords per visitor, then a short wait.
// Cloudflare runs many copies of the Worker, so this is best effort.
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX = 10
const loginAttempts = new Map()

function tooManyAttempts(ip) {
  const now = Date.now()
  const hits = (loginAttempts.get(ip) ?? []).filter((time) => now - time < LOGIN_WINDOW_MS)
  loginAttempts.set(ip, hits)
  return hits.length >= LOGIN_MAX
}

async function handleLogin(request, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: "The admin password hasn't been set up yet." }, 503)
  }
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (tooManyAttempts(ip)) return json({ error: 'Too many tries. Wait 15 minutes and try again.' }, 429)

  const body = await request.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password : ''
  if (!password || !(await sameText(password, env.ADMIN_PASSWORD))) {
    loginAttempts.get(ip).push(Date.now())
    return json({ error: "That password isn't right." }, 401)
  }

  loginAttempts.delete(ip)
  const remember = body.remember === true
  const { token } = await makeSession(env, remember)
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, remember ? REMEMBER_MS / 1000 : undefined) })
}

/* =========================================================
   Admin data
   ========================================================= */

const ORDER_STATUSES = ['new', 'ready', 'done']
const REQUEST_STATUSES = ['new', 'handled']
const LIST_LIMIT = 500

async function listOrders(env) {
  const { results: orders } = await env.DB.prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT ${LIST_LIMIT}`).all()
  const { results: items } = await env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY id DESC LIMIT ${LIST_LIMIT}) ORDER BY id`,
  ).all()
  const byOrder = Map.groupBy(items, (item) => item.order_id)
  return json({
    orders: orders.map((o) => ({
      id: o.id,
      createdAt: o.created_at,
      status: o.status,
      name: o.name,
      email: o.email,
      phone: o.phone,
      address: o.address,
      city: o.city,
      state: o.state,
      zip: o.zip,
      notes: o.notes,
      subtotalCents: o.subtotal_cents,
      shippingCents: o.shipping_cents,
      totalCents: o.total_cents,
      items: (byOrder.get(o.id) ?? []).map((i) => ({ productId: i.product_id, label: i.label, priceCents: i.price_cents, qty: i.qty })),
    })),
  })
}

async function listRequests(env) {
  const { results: requests } = await env.DB.prepare(`SELECT * FROM requests ORDER BY id DESC LIMIT ${LIST_LIMIT}`).all()
  const { results: photos } = await env.DB.prepare(
    `SELECT id, request_id, filename FROM request_photos WHERE request_id IN (SELECT id FROM requests ORDER BY id DESC LIMIT ${LIST_LIMIT}) ORDER BY id`,
  ).all()
  const byRequest = Map.groupBy(photos, (photo) => photo.request_id)
  return json({
    requests: requests.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      name: r.name,
      email: r.email,
      phone: r.phone,
      service: r.service,
      message: r.message,
      photos: (byRequest.get(r.id) ?? []).map((p) => ({ id: p.id, filename: p.filename })),
    })),
  })
}

async function setStatus(request, env, table, id, allowed) {
  const body = await request.json().catch(() => ({}))
  if (!allowed.includes(body.status)) return json({ error: 'Unknown status.' }, 400)
  const result = await env.DB.prepare(
    `UPDATE ${table} SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  )
    .bind(body.status, id)
    .run()
  if (!result.meta.changes) return json({ error: 'Not found.' }, 404)
  return json({ ok: true })
}

// Only ordinary photo types are shown in the browser; anything else downloads,
// so an uploaded file can never run as a page on the site.
const SAFE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff']

async function servePhoto(env, id) {
  const photo = await env.DB.prepare('SELECT r2_key, filename, content_type FROM request_photos WHERE id = ?').bind(id).first()
  const object = photo && env.PHOTOS ? await env.PHOTOS.get(photo.r2_key) : null
  if (!object) return json({ error: 'Photo not found.' }, 404)
  const safe = SAFE_IMAGE_TYPES.includes(photo.content_type)
  const filename = photo.filename.replace(/["\\\r\n]/g, '_')
  return new Response(object.body, {
    headers: {
      'Content-Type': safe ? photo.content_type : 'application/octet-stream',
      'Content-Disposition': `${safe ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

/* =========================================================
   Routing for /api/admin/*
   ========================================================= */

const noStore = { 'Cache-Control': 'no-store' }

// Browsers mark every request with Sec-Fetch-Site, which pages can't fake.
// "same-origin" means the request came from the site's own pages; that also
// holds when testing through the Vite dev server, which rewrites the Host header.
// Older browsers without it fall back to comparing Origin with Host.
function fromThisSite(request) {
  const site = request.headers.get('Sec-Fetch-Site')
  if (site) return site === 'same-origin' || site === 'none'
  const origin = request.headers.get('Origin')
  return !origin || new URL(origin).host === request.headers.get('Host')
}

export async function handleAdmin(request, env) {
  const { pathname } = new URL(request.url)
  const path = pathname.replace(/^\/api\/admin/, '') || '/'
  const method = request.method

  // Changes must come from the site's own pages as JSON (or a photo upload), never from another website
  if (method !== 'GET') {
    if (!fromThisSite(request)) return json({ error: 'Not allowed.' }, 403)
    const type = request.headers.get('Content-Type') ?? ''
    const upload = path === '/images' && type.startsWith('multipart/form-data')
    if (!upload && !type.startsWith('application/json')) return json({ error: 'Send JSON.' }, 415)
  }

  if (path === '/login' && method === 'POST') return handleLogin(request, env)
  if (path === '/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) })

  if (!(await isSignedIn(request, env))) return json({ error: 'Please sign in.' }, 401, noStore)
  if (path === '/me' && method === 'GET') return json({ ok: true, ready: Boolean(env.DB) }, 200, noStore)
  if (!env.DB) return json({ error: "The admin database isn't set up yet." }, 503)

  try {
    if (path === '/orders' && method === 'GET') return withHeaders(await listOrders(env), noStore)
    if (path === '/requests' && method === 'GET') return withHeaders(await listRequests(env), noStore)

    let match = path.match(/^\/orders\/(\d+)$/)
    if (match && method === 'PATCH') return setStatus(request, env, 'orders', Number(match[1]), ORDER_STATUSES)
    match = path.match(/^\/requests\/(\d+)$/)
    if (match && method === 'PATCH') return setStatus(request, env, 'requests', Number(match[1]), REQUEST_STATUSES)
    match = path.match(/^\/photos\/(\d+)$/)
    if (match && method === 'GET') return servePhoto(env, Number(match[1]))

    if (path === '/content' && method === 'GET') return json({ content: await readContent(env) }, 200, noStore)
    match = path.match(/^\/content\/(\w+)$/)
    if (match && method === 'PUT') return saveContent(request, env, match[1])
    if (path === '/images' && method === 'POST') return uploadImage(request, env)
  } catch (error) {
    console.error('Admin request failed:', error.message)
    return json({ error: 'Something went wrong. Try again.' }, 500)
  }

  return json({ error: 'Not found.' }, 404)
}

// Saves one section of the website. { value: null } puts it back to the original.
async function saveContent(request, env, key) {
  const body = await request.json().catch(() => null)
  if (!CONTENT_KEYS.includes(key)) return json({ error: 'Unknown section.' }, 404)
  if (!body || !('value' in body)) return json({ error: 'Nothing to save.' }, 400)
  if (body.value === null) {
    await env.DB.prepare('DELETE FROM content WHERE key = ?').bind(key).run()
    return json({ ok: true })
  }
  const problem = validateContent(key, body.value)
  if (problem) return json({ error: problem }, 400)
  await env.DB.prepare(
    `INSERT INTO content (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  )
    .bind(key, JSON.stringify(body.value))
    .run()
  return json({ ok: true })
}

async function uploadImage(request, env) {
  const form = await request.formData().catch(() => null)
  const result = await saveImage(env, form?.get('image'))
  return json(result, result.error ? 400 : 200)
}

function withHeaders(response, headers) {
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value)
  return response
}
