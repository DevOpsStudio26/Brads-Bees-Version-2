import { Link } from 'react-router-dom'
import { useAdmin } from '../useAdmin'
import { Empty, OrderTable, PageTitle, RequestCard } from '../AdminParts'
import { greeting, longDate, monthKey, moneyShort } from '../format'
import { usePhone } from '../usePhone'
import PhoneHome from './PhoneHome'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Computers get the dashboard; phones get the phone-app home screen
export default function Dashboard() {
  return usePhone() ? <PhoneHome /> : <DeskDashboard />
}

function DeskDashboard() {
  const { orders, requests, setOrderStatus, setRequestStatus } = useAdmin()

  const newOrders = orders.filter((o) => o.status === 'new')
  const readyOrders = orders.filter((o) => o.status === 'ready')
  const openRequests = requests.filter((r) => r.status === 'new')
  const thisMonth = monthKey(new Date())
  const monthOrders = orders.filter((o) => monthKey(new Date(o.createdAt)) === thisMonth)
  const monthSales = monthOrders.reduce((sum, o) => sum + o.totalCents, 0)
  const monthName = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/Chicago' })

  const stats = [
    { to: '/admin/orders?show=new', label: 'New orders', value: newOrders.length, note: newOrders.length ? 'Waiting on you' : 'All caught up' },
    { to: '/admin/requests?show=new', label: 'New requests', value: openRequests.length, note: openRequests.length ? 'Calls to return' : 'All caught up' },
    { to: '/admin/sales', label: `Sales in ${monthName}`, value: moneyShort(monthSales), note: plural(monthOrders.length, 'order') },
    { to: '/admin/orders?show=ready', label: 'Ready to hand over', value: readyOrders.length, note: 'Pickups and deliveries' },
  ]

  return (
    <>
      <PageTitle
        title={`${greeting()}, Brad`}
        subtitle={`${longDate()}. You have ${plural(newOrders.length, 'new order')} and ${plural(openRequests.length, 'new request')}.`}
      />

      <section aria-label="Summary" className="ad-stats">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="ad-stat">
            <small>{stat.label}</small>
            <b>{stat.value}</b>
            <span>{stat.note}</span>
          </Link>
        ))}
      </section>

      <div className="ad-panels">
        <section className="ad-panel">
          <div className="ad-panel-head">
            <h2>Recent orders</h2>
            <Link to="/admin/orders">See all orders</Link>
          </div>
          <OrderTable orders={orders.slice(0, 5)} onStatus={setOrderStatus} />
        </section>

        <section className="ad-panel">
          <div className="ad-panel-head">
            <h2>New requests</h2>
            <Link to="/admin/requests">See all</Link>
          </div>
          {openRequests.length ? (
            openRequests.slice(0, 3).map((r) => <RequestCard key={r.id} request={r} onStatus={setRequestStatus} />)
          ) : (
            <Empty>No new requests. Contact form messages and swarm photos show up here.</Empty>
          )}
        </section>
      </div>
    </>
  )
}
