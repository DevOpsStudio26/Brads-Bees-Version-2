import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChartColumn, ExternalLink, Image, Inbox, LayoutDashboard, LoaderCircle, LogOut, ShoppingBag, Tag } from 'lucide-react'
import brandLogo from '../assets/images/brand-logo.webp'
import { adminApi } from './api'

const REFRESH_MS = 60 * 1000

// The navy side menu (Option 1). Loads orders and requests once, refreshes them
// every minute, and hands them to the page inside through useAdmin().
export default function AdminLayout() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState(null)
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [o, r] = await Promise.all([adminApi.orders(), adminApi.requests()])
      setOrders(o.orders)
      setRequests(r.requests)
      setError('')
    } catch (err) {
      if (err.status === 401) navigate('/admin/login', { replace: true })
      else setError(err.message)
    }
  }, [navigate])

  // Load now, then again every minute so new orders show up on their own
  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  // Shows the change straight away, and puts it back if saving fails
  const changeStatus = useCallback(
    (setList, save) => async (id, status) => {
      let before
      setList((list) => list.map((item) => (item.id === id ? ((before = item.status), { ...item, status }) : item)))
      try {
        await save(id, status)
      } catch (err) {
        setList((list) => list.map((item) => (item.id === id ? { ...item, status: before } : item)))
        if (err.status === 401) navigate('/admin/login', { replace: true })
        else setError(`That change wasn't saved. ${err.message}`)
      }
    },
    [navigate],
  )

  const context = useMemo(
    () => ({
      orders: orders ?? [],
      requests: requests ?? [],
      reload: load,
      setOrderStatus: changeStatus(setOrders, adminApi.setOrderStatus),
      setRequestStatus: changeStatus(setRequests, adminApi.setRequestStatus),
    }),
    [orders, requests, load, changeStatus],
  )

  async function logOut() {
    await adminApi.logout().catch(() => {})
    navigate('/admin/login', { replace: true })
  }

  const newOrders = (orders ?? []).filter((o) => o.status === 'new').length
  const newRequests = (requests ?? []).filter((r) => r.status === 'new').length
  const loading = orders === null || requests === null

  // On phones the menu becomes tabs along the bottom, using the short names.
  // Sales has no tab there; the phone home screen links to it instead.
  const menu = [
    { to: '/admin', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'Orders', short: 'Orders', icon: ShoppingBag, count: newOrders },
    { to: '/admin/requests', label: 'Requests', short: 'Requests', icon: Inbox, count: newRequests },
    { to: '/admin/sales', label: 'Sales', short: 'Sales', icon: ChartColumn, noTab: true },
    { to: '/admin/products', label: 'Products', short: 'Products', icon: Tag },
    { to: '/admin/website', label: 'Website', short: 'Website', icon: Image },
  ]

  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <Link to="/admin" className="ad-brand">
          <img src={brandLogo} alt="" />
          <span>
            <b>Brad's Bees</b>
            <small>Admin</small>
          </span>
        </Link>
        <nav aria-label="Admin menu" className="ad-menu">
          {menu.map(({ to, label, short, icon: Icon, end, count, noTab }) => (
            <NavLink key={to} to={to} end={end} className={noTab ? 'ad-no-tab' : undefined}>
              <Icon size={20} aria-hidden="true" />
              <span className="ad-menu-label">{label}</span>
              <span className="ad-menu-short" aria-hidden="true">
                {short}
              </span>
              {count > 0 && (
                <span className="ad-count" aria-label={`${count} new`}>
                  {count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ad-menu ad-menu-bottom">
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={20} aria-hidden="true" />
            <span className="ad-menu-label">View website</span>
          </a>
          <button type="button" onClick={logOut}>
            <LogOut size={20} aria-hidden="true" />
            <span className="ad-menu-label">Log out</span>
          </button>
        </div>
      </aside>

      <main className="ad-main">
        {error && (
          <div className="ad-alert" role="alert">
            <span>{error}</span>
            <button type="button" className="ad-btn is-line is-small" onClick={load}>
              Try again
            </button>
          </div>
        )}
        {loading && !error ? (
          <p className="ad-loading" role="status">
            <LoaderCircle size={20} className="ad-spin" aria-hidden="true" /> Loading orders and requests…
          </p>
        ) : (
          !loading && <Outlet context={context} />
        )}
      </main>
    </div>
  )
}
