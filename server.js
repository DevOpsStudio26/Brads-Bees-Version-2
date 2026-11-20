// Production server for Railway: serves the built site from dist/ and turns the
// contact form and checkout into emails to Brad (sent through Resend, since
// Railway blocks regular SMTP email on its smaller plans). The emails
// themselves are built in emails.js, shared with the Cloudflare version (worker.js).
//
// Environment variables (set these in Railway > Variables):
//   RESEND_API_KEY   - from resend.com > API Keys (required to send email)
//   CONTACT_TO_EMAIL - where submissions go (defaults to the site's email)
//   EMAIL_FROM       - sender; must be a domain verified in Resend, or the
//                      Resend test sender below
//   EMAIL_DRY_RUN    - "true" prints emails to the console instead of sending
//                      (local testing only)

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
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

const PORT = process.env.PORT || 3001
const DRY_RUN = process.env.EMAIL_DRY_RUN === 'true'
const sendEmail = createMailer({
  resend: process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null,
  to: process.env.CONTACT_TO_EMAIL || 'bradbessetti@gmail.com',
  from: process.env.EMAIL_FROM || "Brad's Bees Website <onboarding@resend.dev>",
  dryRun: DRY_RUN,
})

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const app = express()
app.set('trust proxy', 1)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_PHOTOS, fileSize: MAX_PHOTO_BYTES, fields: 20, fieldSize: 20_000 },
  fileFilter: (req, file, done) => done(null, isImage(file.mimetype, file.originalname)),
})

// Each visitor gets a handful of submissions per window, to stop bots spamming Brad's inbox
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 5
const recentSubmissions = new Map()

function rateLimit(req, res, next) {
  const now = Date.now()
  const hits = (recentSubmissions.get(req.ip) ?? []).filter((time) => now - time < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) {
    return res.status(429).json({ error: 'Too many submissions. Please call us instead.' })
  }
  hits.push(now)
  recentSubmissions.set(req.ip, hits)
  next()
}

/* ---------- Contact form ---------- */

app.post('/api/contact', rateLimit, upload.array('photos', MAX_PHOTOS), async (req, res) => {
  const photos = (req.files ?? []).map((file) => ({ filename: file.originalname, content: file.buffer }))
  const { message, error, spam } = buildContactEmail(req.body, photos)
  if (spam) return res.json({ ok: true })
  if (error) return res.status(400).json({ error })

  try {
    await sendEmail(message)
    res.json({ ok: true })
  } catch (error) {
    console.error('Contact email failed:', error.message)
    res.status(500).json({ error: 'Could not send. Please call us directly.' })
  }
})

/* ---------- Orders ---------- */

app.post('/api/order', rateLimit, express.json({ limit: '50kb' }), async (req, res) => {
  const { message, error } = buildOrderEmail(req.body)
  if (error) return res.status(400).json({ error })

  try {
    await sendEmail(message)
    res.json({ ok: true })
  } catch (error) {
    console.error('Order email failed:', error.message)
    res.status(500).json({ error: 'Could not place the order. Please call us directly.' })
  }
})

// Too many or too large photos
app.use('/api', (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(413).json({ error: PHOTO_LIMIT_ERROR })
  }
  next(error)
})

/* ---------- Website ---------- */

app.use(express.static(distDir, { index: false, maxAge: '1h' }))

// Any other page loads the React app, which handles the route itself
app.get('/{*page}', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Brad's Bees server running on port ${PORT}${DRY_RUN ? ' (email dry run)' : ''}`)
  if (!process.env.RESEND_API_KEY && !DRY_RUN) console.warn('RESEND_API_KEY is not set: form emails will fail.')
})
