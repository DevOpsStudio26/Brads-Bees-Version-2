import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAdmin } from '../useAdmin'
import { Empty, PageTitle } from '../AdminParts'
import { dayKey, money, moneyShort, monthKey } from '../format'

// The month `back` months before this one, as "2026-11"
function monthAt(back) {
  const [year, month] = monthKey(new Date()).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 - back, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthName(key) {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Rounds a chart's top value up to a tidy number: 87 -> 100, 230 -> 250
function niceCeil(value) {
  if (value <= 0) return 10
  const power = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 2.5, 5, 10].map((m) => m * power).find((n) => n >= value)
}

function DailyChart({ month, days }) {
  const W = 640
  const H = 240
  const left = 48
  const bottom = 28
  const top = 18
  const plotW = W - left - 8
  const plotH = H - top - bottom
  const max = niceCeil(Math.max(...days) / 100)
  const slot = plotW / days.length
  const y = (cents) => top + plotH - (cents / 100 / max) * plotH
  const label = (day) => `${monthName(month).split(' ')[0].slice(0, 3)} ${day}`

  return (
    <svg className="ad-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sales each day in ${monthName(month)}`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line className="grid" x1={left} x2={W - 8} y1={top + plotH - f * plotH} y2={top + plotH - f * plotH} />
          <text className="axis" x={left - 8} y={top + plotH - f * plotH + 4} textAnchor="end">
            ${Math.round(max * f)}
          </text>
        </g>
      ))}
      {days.map((cents, i) => {
        const day = i + 1
        const x = left + i * slot + slot * 0.18
        return (
          <g key={day}>
            {cents > 0 && (
              <rect className="bar" x={x} y={y(cents)} width={slot * 0.64} height={top + plotH - y(cents)} rx={Math.min(4, slot * 0.2)}>
                <title>{`${label(day)}: ${money(cents)}`}</title>
              </rect>
            )}
            {(day === 1 || day % 5 === 0) && (
              <text className="axis" x={x + slot * 0.32} y={H - 8} textAnchor="middle">
                {day}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function Sales() {
  const { orders } = useAdmin()
  const [back, setBack] = useState(0)
  const month = monthAt(back)
  const [year, monthNum] = month.split('-').map(Number)
  const dayCount = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()

  const monthOrders = orders.filter((o) => monthKey(new Date(o.createdAt)) === month)
  const total = monthOrders.reduce((sum, o) => sum + o.totalCents, 0)
  const days = Array.from({ length: dayCount }, () => 0)
  monthOrders.forEach((o) => {
    days[Number(dayKey(new Date(o.createdAt)).slice(8)) - 1] += o.totalCents
  })

  const products = new Map()
  monthOrders.forEach((o) =>
    o.items.forEach((item) => {
      const row = products.get(item.label) ?? { label: item.label, qty: 0, cents: 0 }
      row.qty += item.qty
      row.cents += item.qty * item.priceCents
      products.set(item.label, row)
    }),
  )
  const top = [...products.values()].sort((a, b) => b.cents - a.cents)

  return (
    <>
      <PageTitle title="Sales" subtitle="Every order placed on the shop. Payment is arranged with the customer, so these are orders, not money in the bank.">
        <div className="ad-month" role="group" aria-label="Month">
          <button type="button" className="ad-btn is-line is-small" onClick={() => setBack(back + 1)} aria-label="Previous month">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <b>{monthName(month)}</b>
          <button type="button" className="ad-btn is-line is-small" onClick={() => setBack(back - 1)} disabled={back === 0} aria-label="Next month">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </PageTitle>

      <section aria-label="Totals" className="ad-stats">
        <div className="ad-stat">
          <small>Sales</small>
          <b>{moneyShort(total)}</b>
          <span>{monthName(month)}</span>
        </div>
        <div className="ad-stat">
          <small>Orders</small>
          <b>{monthOrders.length}</b>
          <span>Placed this month</span>
        </div>
        <div className="ad-stat">
          <small>Average order</small>
          <b>{monthOrders.length ? money(Math.round(total / monthOrders.length)) : '–'}</b>
          <span>Per customer</span>
        </div>
        <div className="ad-stat">
          <small>Best seller</small>
          <b className="is-text">{top[0]?.label ?? '–'}</b>
          <span>{top[0] ? `${top[0].qty} sold` : 'No sales yet'}</span>
        </div>
      </section>

      {monthOrders.length ? (
        <div className="ad-panels">
          <section className="ad-panel">
            <h2>Sales each day</h2>
            <DailyChart month={month} days={days} />
          </section>
          <section className="ad-panel">
            <h2>What's selling</h2>
            <div className="ad-table-wrap">
              <table className="ad-table is-tight">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Sold</th>
                    <th>Brought in</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>
                        <b>{row.qty}</b>
                      </td>
                      <td>
                        <b>{money(row.cents)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <section className="ad-panel">
          <Empty>No orders in {monthName(month)}.</Empty>
        </section>
      )}
    </>
  )
}
