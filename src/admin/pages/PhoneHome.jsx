import { Link } from 'react-router-dom'
import { useAdmin } from '../useAdmin'
import { Empty, JobCard } from '../AdminParts'
import { greeting, longDate, monthKey, moneyShort } from '../format'

// The phone-app home screen (Option 3): three counters, then one list of
// everything that needs Brad, bee calls and orders together, newest first.
export default function PhoneHome() {
  const { orders, requests, setOrderStatus, setRequestStatus } = useAdmin()

  const newOrders = orders.filter((o) => o.status === 'new')
  const openOrders = orders.filter((o) => o.status === 'new' || o.status === 'ready')
  const openRequests = requests.filter((r) => r.status === 'new')
  const thisMonth = monthKey(new Date())
  const monthSales = orders
    .filter((o) => monthKey(new Date(o.createdAt)) === thisMonth)
    .reduce((sum, o) => sum + o.totalCents, 0)

  const todo = [
    ...openRequests.map((job) => ({ job, kind: 'request' })),
    ...openOrders.map((job) => ({ job, kind: 'order' })),
  ].sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt))

  return (
    <>
      <header className="ad-phone-hello">
        <h1>{greeting()}, Brad</h1>
        <p>{longDate()}</p>
      </header>

      <section aria-label="Summary" className="ad-phone-stats">
        <Link to="/admin/requests?show=new">
          <b>{openRequests.length}</b>
          <span>New requests</span>
        </Link>
        <Link to="/admin/orders?show=new">
          <b>{newOrders.length}</b>
          <span>New orders</span>
        </Link>
        <Link to="/admin/sales">
          <b>{moneyShort(monthSales)}</b>
          <span>Sales this month</span>
        </Link>
      </section>

      <section aria-labelledby="todo-title" className="ad-job-list">
        <h2 id="todo-title" className="ad-phone-heading">
          {todo.length ? `Needs you (${todo.length})` : 'Needs you'}
        </h2>
        {todo.length ? (
          todo.map(({ job, kind }) => (
            <JobCard
              key={`${kind}-${job.id}`}
              job={job}
              kind={kind}
              onStatus={kind === 'order' ? setOrderStatus : setRequestStatus}
            />
          ))
        ) : (
          <Empty>All caught up. New bee calls and orders show up here.</Empty>
        )}
      </section>
    </>
  )
}
