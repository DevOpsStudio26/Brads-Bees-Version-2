// Cloudflare version of server.js, for Brad's own domain. Cloudflare serves the
// built site from dist/ (see wrangler.jsonc) and only runs this for /api/*,
// turning the contact form and checkout into emails to Brad through Resend.
// Each one is also saved to the database for the admin page (see admin.js),
// which is the only part of /api/admin/* this file doesn't handle itself.
//
// Settings (Cloudflare dashboard > Workers & Pages > brads-bees > Settings > Variables and Secrets):
//   RESEND_API_KEY   - secret, from resend.com > API Keys (required to send email)
//   CONTACT_TO_EMAIL - where submissions go (set in wrangler.jsonc)
//   EMAIL_FROM       - sender; must be a domain verified in Resend, or the
//                      Resend test sender below
//   EMAIL_DRY_RUN    - "true" prints emails to the log instead of sending
//                      (local testing only)

import { Buffer } from 'node:buffer'
import { Resend } from 'resend'
import {
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  PHOTO_LIMIT_ERROR,
  buildContactEmail,
  buildOrderEmail,
  createMailer,
  isImage,
} from './emails.js'
import { handleAdmin, saveOrder, saveRequest } from './admin.js'
import { handlePublicContent, loadProductCatalog, serveImage } from './content.js'

const json = (body, status = 200) => Response.json(body, { status })

// Each visitor gets a handful of submissions per window, to stop bots spamming Brad's inbox.
// Cloudflare runs many copies of the Worker, so this is best effort rather than a hard limit.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 5
const recentSubmissions = new Map()

function isRateLimited(request) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()
  const hits = (recentSubmissions.get(ip) ?? []).filter((time) => now - time < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) return true
  hits.push(now)
  recentSubmissions.set(ip, hits)
  return false
}

/* ---------- Contact form ---------- */

// Saves first, then emails. Brad still gets the email if saving fails, and the
// customer sees success if either one worked, so a resend never doubles up.
async function saveAndSend(save, sendEmail, message, what) {
  let saved = false
  try {
    if (save) {
      await save()
      saved = true
    }
  } catch (error) {
    console.error(`Saving ${what} failed:`, error.message)
  }
  try {
    await sendEmail(message)
    return true
  } catch (error) {
    console.error(`${what} email failed:`, error.message)
    return saved
  }
}

async function handleContact(request, sendEmail, env) {
  let form
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Please check the form and try again.' }, 400)
  }

  const fields = {}
  const photos = []
  for (const [key, value] of form) {
    if (typeof value === 'string') {
      fields[key] = value
    } else if (key === 'photos' && isImage(value.type, value.name)) {
      if (photos.length >= MAX_PHOTOS || value.size > MAX_PHOTO_BYTES) {
        return json({ error: PHOTO_LIMIT_ERROR }, 413)
      }
      photos.push({
        filename: value.name,
        content: Buffer.from(await value.arrayBuffer()),
        contentType: value.type || 'application/octet-stream',
      })
    }
  }

  const attachments = photos.map(({ filename, content }) => ({ filename, content }))
  const { message, contact, error, spam } = buildContactEmail(fields, attachments)
  if (spam) return json({ ok: true })
  if (error) return json({ error }, 400)

  const save = env.DB ? () => saveRequest(env, contact, photos) : null
  if (await saveAndSend(save, sendEmail, message, 'Contact')) return json({ ok: true })
  return json({ error: 'Could not send. Please call us directly.' }, 500)
}

/* ---------- Orders ---------- */

async function handleOrder(request, sendEmail, env) {
  const raw = await request.text()
  let body
  try {
    if (raw.length > 50_000) throw new Error('Order too large')
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Please check the order and try again.' }, 400)
  }

  // Prices and stock as Brad last saved them in the admin
  const catalog = await loadProductCatalog(env)
  const { message, order, error } = buildOrderEmail(body, catalog ?? undefined)
  if (error) return json({ error }, 400)

  const save = env.DB ? () => saveOrder(env, order) : null
  if (await saveAndSend(save, sendEmail, message, 'Order')) return json({ ok: true })
  return json({ error: 'Could not place the order. Please call us directly.' }, 500)
}

/* ---------- Routing ---------- */

const routes = {
  '/api/contact': handleContact,
  '/api/order': handleOrder,
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) return handleAdmin(request, env)
    if (request.method === 'GET' && pathname === '/api/content') return handlePublicContent(env)
    if (request.method === 'GET' && pathname.startsWith('/api/images/')) return serveImage(env, pathname)

    const handler = routes[pathname]
    if (!handler) return env.ASSETS.fetch(request)
    if (request.method !== 'POST') return json({ error: 'Not found' }, 404)
    if (isRateLimited(request)) {
      return json({ error: 'Too many submissions. Please call us instead.' }, 429)
    }

    const sendEmail = createMailer({
      resend: env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null,
      to: env.CONTACT_TO_EMAIL || 'bradbessetti@gmail.com',
      from: env.EMAIL_FROM || "Brad's Bees Website <onboarding@resend.dev>",
      dryRun: env.EMAIL_DRY_RUN === 'true',
    })
    return handler(request, sendEmail, env)
  },
}
