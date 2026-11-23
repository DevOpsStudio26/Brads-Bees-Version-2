// Builds the contact and order emails sent to Brad. Shared by both hosts:
// server.js (Railway) and worker.js (Cloudflare), so the emails stay identical.
//
// Each builder returns { message } ready for Resend (plus the checked form data,
// as contact or order, so worker.js can save it for the admin page), { error }
// when the form is invalid, or { spam: true } when a bot filled in the hidden field.

import { productCatalog, productLabel, shippingFor } from './src/data/productCatalog.js'
import { isValidEmail, isValidName, isValidPhone } from './src/lib/validation.js'

// Resend allows 40MB per email after encoding, so cap photos well under that
export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const PHOTO_LIMIT_ERROR = `Please attach up to ${MAX_PHOTOS} photos, each under ${MAX_PHOTO_BYTES / 1024 / 1024}MB.`

// Some phones send photos (like iPhone HEIC) without an image type, so also check the extension
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i
export const isImage = (type, filename) => type.startsWith('image/') || IMAGE_EXTENSIONS.test(filename)

/* ---------- Helpers ---------- */

const text = (value, max = 2000) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const money = (value) => `$${value.toFixed(2)}`

function detailRows(rows) {
  return rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top"><b>${label}</b></td>` +
        `<td style="padding:4px 0">${escapeHtml(value).replaceAll('\n', '<br>')}</td></tr>`,
    )
    .join('')
}

function emailLayout(title, body) {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;color:#101b34">
  <h2 style="margin:0 0 4px;color:#d98500">${escapeHtml(title)}</h2>
  <p style="margin:0 0 16px;color:#666">Sent from the Brad's Bees website. Hit Reply to answer the customer.</p>
  ${body}
</div>`
}

/* ---------- Contact form ---------- */

// photos: [{ filename, content }]
export function buildContactEmail(body = {}, photos = []) {
  // Hidden "website" field: people never see it, bots fill it in
  if (text(body.website)) return { spam: true }

  const contact = {
    name: text(body.name, 100),
    email: text(body.email, 200),
    phone: text(body.phone, 20),
    service: text(body.service, 100),
    message: text(body.message, 5000),
  }
  if (
    !isValidName(contact.name) ||
    !isValidEmail(contact.email) ||
    !isValidPhone(contact.phone) ||
    !contact.message
  ) {
    return { error: 'Please check the form and try again.' }
  }

  const table = detailRows([
    ['Name', contact.name],
    ['Phone', contact.phone],
    ['Email', contact.email],
    ['Service', contact.service],
    ['Message', contact.message],
    ['Photos', photos.length ? `${photos.length} attached` : ''],
  ])

  return {
    contact,
    message: {
      replyTo: contact.email,
      subject: `New ${contact.service || 'website'} request from ${contact.name}`,
      html: emailLayout('New Message', `<table>${table}</table>`),
      attachments: photos,
    },
  }
}

/* ---------- Orders ---------- */

// catalog: the products as Brad last saved them in the admin (worker.js passes
// them in); without it, the original list in src/data/productCatalog.js
export function buildOrderEmail({ customer = {}, items = [] } = {}, catalog = productCatalog) {
  const getCatalogProduct = (id) => catalog.find((product) => product.id === id)
  const buyer = {
    name: text(customer.name, 100),
    email: text(customer.email, 200),
    phone: text(customer.phone, 20),
    address: text(customer.address, 200),
    city: text(customer.city, 100),
    state: text(customer.state, 50),
    zip: text(customer.zip, 20),
    notes: text(customer.notes, 2000),
  }

  // Prices always come from the catalog, never from the browser
  const lines = (Array.isArray(items) ? items : [])
    .slice(0, 50)
    .map(({ id, qty } = {}) => ({ product: getCatalogProduct(id), qty: Number(qty) }))
    .filter(({ product, qty }) => product && Number.isInteger(qty) && qty > 0 && qty <= 100)

  const soldOut = lines.find(({ product }) => product.inStock === false)
  if (soldOut) {
    return { error: `Sorry, ${productLabel(soldOut.product)} just sold out. Please remove it from your cart.` }
  }

  if (
    lines.length === 0 ||
    !isValidName(buyer.name) ||
    !isValidEmail(buyer.email) ||
    !isValidPhone(buyer.phone) ||
    !buyer.address ||
    !buyer.city ||
    !buyer.state ||
    !buyer.zip
  ) {
    return { error: 'Please check the order and try again.' }
  }

  const subtotal = lines.reduce((sum, { product, qty }) => sum + product.price * qty, 0)
  const shipping = shippingFor(subtotal)
  const total = subtotal + shipping

  const itemRows = lines
    .map(
      ({ product, qty }) =>
        `<tr><td style="padding:6px 0">${escapeHtml(productLabel(product))}</td>` +
        `<td style="padding:6px 12px;text-align:center">${qty}</td>` +
        `<td style="padding:6px 0;text-align:right">${money(product.price * qty)}</td></tr>`,
    )
    .join('')
  const totals = [
    ['Subtotal', money(subtotal)],
    ['Pickup / Delivery', shipping ? money(shipping) : 'Free'],
    ['Total', money(total)],
  ]
    .map(
      ([label, value]) =>
        `<tr><td colspan="2" style="padding:4px 12px 4px 0;text-align:right">${label}</td>` +
        `<td style="padding:4px 0;text-align:right"><b>${value}</b></td></tr>`,
    )
    .join('')

  const customerTable = detailRows([
    ['Name', buyer.name],
    ['Phone', buyer.phone],
    ['Email', buyer.email],
    ['Address', `${buyer.address}\n${buyer.city}, ${buyer.state} ${buyer.zip}`],
    ['Notes', buyer.notes],
  ])

  return {
    order: { buyer, lines, subtotal, shipping, total },
    message: {
      replyTo: buyer.email,
      subject: `New order from ${buyer.name} - ${money(total)}`,
      html: emailLayout(
        'New Order',
        `<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr style="border-bottom:1px solid #ddd"><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th></tr>
          ${itemRows}${totals}
        </table>
        <h3 style="margin:16px 0 8px">Customer</h3>
        <table>${customerTable}</table>
        <p style="color:#666">Payment hasn't been taken. Contact the customer to arrange payment and pickup or delivery.</p>`,
      ),
    },
  }
}

/* ---------- Sending ---------- */

// Returns send(message), which emails Brad or, in dry-run mode, prints the email instead
export function createMailer({ resend, to, from, dryRun }) {
  return async function send(message) {
    if (dryRun) {
      console.log('[email dry run]', {
        ...message,
        attachments: message.attachments?.map((file) => `${file.filename} (${file.content.length} bytes)`),
      })
      return
    }
    if (!resend) throw new Error('RESEND_API_KEY is not set')
    const { error } = await resend.emails.send({ from, to, ...message })
    if (error) throw new Error(error.message)
  }
}
