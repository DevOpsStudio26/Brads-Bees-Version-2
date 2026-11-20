// Cloudflare version of server.js, for Brad's own domain. Cloudflare serves the
// built site from dist/ (see wrangler.jsonc) and only runs this for /api/*,
// turning the contact form and checkout into emails to Brad through Resend.
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

async function handleContact(request, sendEmail) {
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
      photos.push({ filename: value.name, content: Buffer.from(await value.arrayBuffer()) })
    }
  }

  const { message, error, spam } = buildContactEmail(fields, photos)
  if (spam) return json({ ok: true })
  if (error) return json({ error }, 400)

  try {
    await sendEmail(message)
    return json({ ok: true })
  } catch (error) {
    console.error('Contact email failed:', error.message)
    return json({ error: 'Could not send. Please call us directly.' }, 500)
  }
}

/* ---------- Orders ---------- */

async function handleOrder(request, sendEmail) {
  const raw = await request.text()
  let body
  try {
    if (raw.length > 50_000) throw new Error('Order too large')
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Please check the order and try again.' }, 400)
  }

  const { message, error } = buildOrderEmail(body)
  if (error) return json({ error }, 400)

  try {
    await sendEmail(message)
    return json({ ok: true })
  } catch (error) {
    console.error('Order email failed:', error.message)
    return json({ error: 'Could not place the order. Please call us directly.' }, 500)
  }
}

/* ---------- Routing ---------- */

const routes = {
  '/api/contact': handleContact,
  '/api/order': handleOrder,
}

export default {
  async fetch(request, env) {
    const handler = routes[new URL(request.url).pathname]
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
    return handler(request, sendEmail)
  },
}
