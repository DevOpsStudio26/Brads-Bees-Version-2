// Formatting shared by the admin pages. Times are shown in Brad's time zone.

export const TIME_ZONE = 'America/Chicago'

export const money = (cents) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Whole dollars when there are no cents: $219 rather than $219.00
export const moneyShort = (cents) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0 })

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, month: 'short', day: 'numeric' })
const longDateFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric' })
const hourFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23' })

// "2026-11-20" in Brad's time zone
export const dayKey = (date) => dayKeyFormat.format(date)
export const monthKey = (date) => dayKey(date).slice(0, 7)

// "Today, 9:14 AM", "Yesterday, 4:02 PM" or "Nov 16, 9:14 AM"
export function when(iso) {
  const date = new Date(iso)
  const today = dayKey(new Date())
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const day = dayKey(date)
  const label = day === today ? 'Today' : day === yesterday ? 'Yesterday' : dateFormat.format(date)
  return `${label}, ${timeFormat.format(date)}`
}

export const longDate = (date = new Date()) => longDateFormat.format(date)

export function greeting(date = new Date()) {
  const hour = Number(hourFormat.format(date))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export const ORDER_STATUS = {
  new: { label: 'New', next: 'ready', action: 'Mark ready' },
  ready: { label: 'Ready', next: 'done', action: 'Mark done' },
  done: { label: 'Done', next: 'new', action: 'Reopen' },
}

export const REQUEST_STATUS = {
  new: { label: 'New', next: 'handled', action: 'Mark handled' },
  handled: { label: 'Handled', next: 'new', action: 'Reopen' },
}

// "985-612-0241" -> "+19856120241" for tel: and sms: links
export const phoneHref = (phone) => `+1${phone.replace(/\D/g, '')}`

export const itemSummary = (items) => items.map((item) => `${item.qty}× ${item.label}`).join(', ')
