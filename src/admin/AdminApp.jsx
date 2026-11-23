import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Requests from './pages/Requests'
import Sales from './pages/Sales'
import Products from './pages/Products'
import Website from './pages/Website'
import './admin.css'

// Everything under /admin. Loaded separately from the public site (see App.jsx),
// so visitors never download the admin code.
export default function AdminApp() {
  // Keep the admin out of Google, give the tab its own name, and let Brad
  // "Add to Home Screen" on his phone so the admin opens like an app.
  useEffect(() => {
    const previousTitle = document.title
    document.title = "Admin · Brad's Bees"
    const tags = [
      ['meta', { name: 'robots', content: 'noindex, nofollow' }],
      ['link', { rel: 'manifest', href: '/admin.webmanifest' }],
      ['link', { rel: 'apple-touch-icon', href: '/admin-apple-touch-icon.png' }],
      ['meta', { name: 'apple-mobile-web-app-title', content: 'Bees Admin' }],
      ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ].map(([tag, attrs]) => Object.assign(document.createElement(tag), attrs))
    document.head.append(...tags)
    return () => {
      document.title = previousTitle
      tags.forEach((tag) => tag.remove())
    }
  }, [])

  return (
    <div className="admin">
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="requests" element={<Requests />} />
          <Route path="sales" element={<Sales />} />
          <Route path="products" element={<Products />} />
          <Route path="website" element={<Website />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </div>
  )
}
