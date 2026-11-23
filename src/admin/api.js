// Calls to /api/admin/* (handled by admin.js in the Cloudflare Worker).
// The login cookie is sent automatically; a 401 means Brad needs to sign in again.

export class AdminError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/admin${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const fallback = response.status === 404 ? "The admin server isn't running." : 'Something went wrong. Try again.'
    throw new AdminError(data.error || fallback, response.status)
  }
  return data
}

export const adminApi = {
  me: () => request('/me'),
  login: (password, remember) => request('/login', { method: 'POST', body: { password, remember } }),
  logout: () => request('/logout', { method: 'POST', body: {} }),
  orders: () => request('/orders'),
  requests: () => request('/requests'),
  setOrderStatus: (id, status) => request(`/orders/${id}`, { method: 'PATCH', body: { status } }),
  setRequestStatus: (id, status) => request(`/requests/${id}`, { method: 'PATCH', body: { status } }),
  // value: the whole section, or null to put it back to the original
  saveContent: (key, value) => request(`/content/${key}`, { method: 'PUT', body: { value } }),
  uploadImage,
}

// Sends one photo; returns { url } to put in the content
async function uploadImage(file) {
  const form = new FormData()
  form.append('image', file)
  const response = await fetch('/api/admin/images', { method: 'POST', credentials: 'same-origin', body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new AdminError(data.error || "That photo didn't upload. Try again.", response.status)
  return data
}

export const photoUrl = (id) => `/api/admin/photos/${id}`
