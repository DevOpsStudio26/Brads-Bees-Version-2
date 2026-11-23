// Website content Brad edits from the admin page, for the Cloudflare Worker.
//   GET /api/content          - every section Brad has changed (the site falls back to src/data/ for the rest)
//   GET /api/images/<name>     - photos Brad uploaded (stored in the PHOTOS bucket under site/)
// Saving and uploading happen in admin.js, which uses validateContent and saveImage from here.

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers })

export const CONTENT_KEYS = ['products', 'siteInfo', 'gallery', 'testimonials', 'services', 'education']

/* ---------- Reading ---------- */

export async function readContent(env) {
  if (!env.DB) return {}
  const { results } = await env.DB.prepare('SELECT key, value FROM content').all()
  return Object.fromEntries(results.filter((r) => CONTENT_KEYS.includes(r.key)).map((r) => [r.key, JSON.parse(r.value)]))
}

export async function handlePublicContent(env) {
  try {
    return json({ content: await readContent(env) }, 200, { 'Cache-Control': 'no-cache' })
  } catch (error) {
    console.error('Reading content failed:', error.message)
    return json({ content: {} }, 200, { 'Cache-Control': 'no-store' })
  }
}

// The shop's products as Brad last saved them, or null to use src/data/productCatalog.js
export async function loadProductCatalog(env) {
  if (!env.DB) return null
  try {
    const row = await env.DB.prepare("SELECT value FROM content WHERE key = 'products'").first()
    return row ? JSON.parse(row.value) : null
  } catch (error) {
    console.error('Reading products failed:', error.message)
    return null
  }
}

/* ---------- Uploaded photos ---------- */

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
const EXT_TYPES = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([type, ext]) => [ext, type]))
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

// file: a File from FormData. Returns { url } or { error }.
export async function saveImage(env, file) {
  if (!env.PHOTOS) return { error: "Photo storage isn't set up yet." }
  if (!file || typeof file === 'string') return { error: 'Choose a photo to upload.' }
  const ext = IMAGE_TYPES[file.type]
  if (!ext) return { error: 'Use a JPG, PNG, WebP or GIF photo. (iPhone HEIC photos need converting first.)' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'That photo is too big. Use one under 8 MB.' }
  const name = `${crypto.randomUUID()}.${ext}`
  await env.PHOTOS.put(`site/${name}`, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  return { url: `/api/images/${name}` }
}

export async function serveImage(env, pathname) {
  const name = pathname.slice('/api/images/'.length)
  const ext = name.match(/^[a-f0-9-]{36}\.([a-z]+)$/)?.[1]
  const object = ext && EXT_TYPES[ext] && env.PHOTOS ? await env.PHOTOS.get(`site/${name}`) : null
  if (!object) return new Response('Not found', { status: 404 })
  return new Response(object.body, {
    headers: {
      'Content-Type': EXT_TYPES[ext],
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

/* ---------- Checking what Brad saves ---------- */

const MAX_JSON = 300 * 1024
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isText = (v, max = 5000) => typeof v === 'string' && v.length <= max

// Field names whose values are links or pictures, and what they may contain
const IMAGE_FIELDS = ['image', 'src', 'icon']
const IMAGE_VALUE = /^(asset:[\w./-]+|\/api\/images\/[a-f0-9-]{36}\.[a-z]+)?$/
const LINK_FIELDS = { url: /^https?:\/\/\S+$/, facebook: /^https?:\/\/\S+$/, mapsUrl: /^https?:\/\/\S+$/, phoneHref: /^tel:\+?\d+$/, smsHref: /^sms:\+?\d+$/ }

// Walks the whole value: only plain JSON, sensible sizes, safe links and pictures
function checkTree(value, field = '', depth = 0) {
  if (depth > 8) return 'Too deeply nested.'
  if (typeof value === 'string') {
    if (value.length > 5000) return `"${field}" is too long.`
    if (IMAGE_FIELDS.includes(field) && !IMAGE_VALUE.test(value)) return `"${field}" isn't a photo from this site.`
    if (LINK_FIELDS[field] && value && !LINK_FIELDS[field].test(value)) return `"${field}" isn't a valid link.`
    return null
  }
  if (typeof value === 'number') return Number.isFinite(value) ? null : `"${field}" isn't a number.`
  if (typeof value === 'boolean' || value === null) return null
  if (Array.isArray(value)) {
    if (value.length > 300) return 'Too many items in a list.'
    for (const item of value) {
      const error = checkTree(item, field, depth + 1)
      if (error) return error
    }
    return null
  }
  if (isObj(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (key.length > 60) return 'A field name is too long.'
      const error = checkTree(item, key, depth + 1)
      if (error) return error
    }
    return null
  }
  return 'Only text, numbers and lists can be saved.'
}

const SHAPES = {
  products(list) {
    if (!Array.isArray(list) || list.length === 0) return 'The shop needs at least one product.'
    const ids = new Set()
    for (const p of list) {
      if (!isObj(p) || !/^[a-z0-9-]{1,60}$/.test(p.id ?? '')) return 'A product is missing its ID.'
      if (ids.has(p.id)) return 'Two products have the same ID.'
      ids.add(p.id)
      if (!isText(p.name, 100) || !p.name.trim()) return 'Every product needs a name.'
      if (typeof p.price !== 'number' || p.price < 0 || p.price > 100000) return `"${p.name}" needs a price.`
      if (typeof p.inStock !== 'boolean') return `"${p.name}" needs In stock set.`
      if (typeof p.rating !== 'number' || p.rating < 0 || p.rating > 5) return `"${p.name}" needs a rating from 0 to 5.`
    }
    return null
  },
  siteInfo(info) {
    if (!isObj(info) || !isText(info.phone, 30) || !isText(info.email, 200)) return 'Contact details need a phone number and email.'
    if (!Array.isArray(info.hours)) return 'Opening hours are missing.'
    return null
  },
  gallery(g) {
    if (!isObj(g) || !Array.isArray(g.photos) || !Array.isArray(g.categories)) return 'The gallery is missing its photos.'
    if (g.photos.some((p) => !isObj(p) || !p.src)) return 'Every gallery photo needs a picture.'
    return null
  },
  testimonials(list) {
    if (!Array.isArray(list)) return 'Reviews are missing.'
    if (list.some((t) => !isObj(t) || !isText(t.name, 100) || !t.name.trim() || !isText(t.quote) || typeof t.rating !== 'number')) {
      return 'Every review needs a name, a rating and the words.'
    }
    return null
  },
  services(list) {
    if (!Array.isArray(list) || list.some((s) => !isObj(s) || !s.id || !isObj(s.hero) || !isObj(s.package) || !isObj(s.cta))) {
      return 'A service is missing part of its page.'
    }
    return null
  },
  education(e) {
    if (!isObj(e) || !Array.isArray(e.programs) || !Array.isArray(e.topics)) return 'Education programs are missing.'
    return null
  },
}

// Returns an error message to show Brad, or null if the value is fine to save
export function validateContent(key, value) {
  if (!CONTENT_KEYS.includes(key)) return 'Unknown section.'
  if (JSON.stringify(value).length > MAX_JSON) return 'That section is too big to save.'
  return checkTree(value) ?? SHAPES[key](value)
}
