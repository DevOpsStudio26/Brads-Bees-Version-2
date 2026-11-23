import { Fragment, useState } from 'react'
import { Camera, Check, Mail, MessageSquare, Phone, RotateCcw } from 'lucide-react'
import { ORDER_STATUS, REQUEST_STATUS, itemSummary, money, phoneHref, when } from './format'
import { photoUrl } from './api'
import { usePhone } from './usePhone'

export function PageTitle({ title, subtitle, children }) {
  return (
    <header className="ad-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}

export function StatusPill({ status, kind = 'order' }) {
  const info = (kind === 'order' ? ORDER_STATUS : REQUEST_STATUS)[status]
  return <span className={`ad-pill is-${status}`}>{info?.label ?? status}</span>
}

// options: [{ value, label, count }]
export function FilterChips({ label, options, value, onChange }) {
  return (
    <div className="ad-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && ` (${option.count})`}
        </button>
      ))}
    </div>
  )
}

export function Empty({ children }) {
  return <p className="ad-empty">{children}</p>
}

// Real links: on a phone these open the dialer, Messages and Mail
export function ContactButtons({ person, compact = false }) {
  const first = person.name.split(' ')[0]
  return (
    <div className="ad-contact">
      <a className="ad-btn is-gold" href={`tel:${phoneHref(person.phone)}`}>
        <Phone size={16} aria-hidden="true" />
        {compact ? 'Call' : `Call ${first}`}
      </a>
      <a className="ad-btn is-soft" href={`sms:${phoneHref(person.phone)}`}>
        <MessageSquare size={16} aria-hidden="true" />
        Text
      </a>
      {!compact && (
        <a className="ad-btn is-soft" href={`mailto:${person.email}`}>
          <Mail size={16} aria-hidden="true" />
          Email
        </a>
      )}
    </div>
  )
}

export function StatusButton({ status, kind, onChange, size = '' }) {
  const info = (kind === 'order' ? ORDER_STATUS : REQUEST_STATUS)[status]
  const reopen = info.next === 'new'
  return (
    <button type="button" className={`ad-btn ${reopen ? 'is-line' : 'is-dark'} ${size}`} onClick={() => onChange(info.next)}>
      {reopen ? <RotateCcw size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
      {info.action}
    </button>
  )
}

// Phone layout: one card per order or request, with Call, Text and the next
// step as big buttons under Brad's thumb. Orders can open their full details.
export function JobCard({ job, kind, onStatus }) {
  const [open, setOpen] = useState(false)
  const isOrder = kind === 'order'
  const finished = job.status === 'done' || job.status === 'handled'
  const detailsId = `${kind}-${job.id}-details`

  return (
    <article className={`ad-job ${finished ? 'is-done' : ''}`}>
      <div className="ad-job-kind">
        <b className={isOrder ? 'is-order' : 'is-request'}>{isOrder ? `Order #${job.id}` : job.service || 'Message'}</b>
        <span>{when(job.createdAt)}</span>
      </div>
      <div className="ad-job-who">
        <span>{job.name}</span>
        {isOrder ? <span>{money(job.totalCents)}</span> : <StatusPill status={job.status} kind="request" />}
      </div>
      {isOrder ? (
        <p>
          {itemSummary(job.items)} · {job.city}
        </p>
      ) : (
        <p className="ad-pre ad-job-message">{job.message}</p>
      )}

      {!isOrder && job.photos.length > 0 && (
        <div className="ad-photos is-small">
          {job.photos.map((photo) => (
            <a key={photo.id} href={photoUrl(photo.id)} target="_blank" rel="noreferrer" title={`Open ${photo.filename}`}>
              <img src={photoUrl(photo.id)} alt={`Photo from ${job.name}: ${photo.filename}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}

      {isOrder && (
        <div className="ad-job-status">
          <StatusPill status={job.status} />
          <button type="button" className="ad-link-btn" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(!open)}>
            {open ? 'Hide details' : 'Address and details'}
          </button>
        </div>
      )}
      {isOrder && open && (
        <dl className="ad-job-details" id={detailsId}>
          <dt>Address</dt>
          <dd>
            {job.address}, {job.city}, {job.state} {job.zip}
          </dd>
          <dt>Phone</dt>
          <dd>{job.phone}</dd>
          <dt>Email</dt>
          <dd>{job.email}</dd>
          {job.notes && (
            <>
              <dt>Notes</dt>
              <dd className="ad-pre">{job.notes}</dd>
            </>
          )}
          <dt>Items</dt>
          <dd>
            {job.items.map((item) => (
              <div key={item.productId}>
                {item.qty}× {item.label} at {money(item.priceCents)}
              </div>
            ))}
          </dd>
        </dl>
      )}

      <div className="ad-job-actions">
        {!finished && <ContactButtons person={job} compact />}
        <StatusButton status={job.status} kind={kind} size="is-big" onChange={(next) => onStatus(job.id, next)} />
      </div>
    </article>
  )
}

export function OrderTable({ orders, onStatus }) {
  const [openId, setOpenId] = useState(null)
  const phone = usePhone()
  if (!orders.length) return <Empty>No orders here yet. When someone checks out on the shop, the order shows up here.</Empty>
  if (phone) {
    return (
      <div className="ad-job-list">
        {orders.map((order) => (
          <JobCard key={order.id} job={order} kind="order" onStatus={onStatus} />
        ))}
      </div>
    )
  }
  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const open = openId === order.id
            return (
              <Fragment key={order.id}>
                <tr className={open ? 'is-open' : ''}>
                  <td>
                    <b>#{order.id}</b>
                    <small>{when(order.createdAt)}</small>
                  </td>
                  <td>
                    <b>{order.name}</b>
                    <small>{order.city}</small>
                  </td>
                  <td>{itemSummary(order.items)}</td>
                  <td>
                    <b>{money(order.totalCents)}</b>
                  </td>
                  <td>
                    <StatusPill status={order.status} />
                  </td>
                  <td>
                    <div className="ad-row-actions">
                      <StatusButton status={order.status} kind="order" size="is-small" onChange={(next) => onStatus(order.id, next)} />
                      <button
                        type="button"
                        className="ad-btn is-line is-small"
                        aria-expanded={open}
                        aria-controls={`order-${order.id}`}
                        onClick={() => setOpenId(open ? null : order.id)}
                      >
                        {open ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="ad-details" id={`order-${order.id}`}>
                    <td colSpan={6}>
                      <dl>
                        <dt>Phone</dt>
                        <dd>{order.phone}</dd>
                        <dt>Email</dt>
                        <dd>{order.email}</dd>
                        <dt>Address</dt>
                        <dd>
                          {order.address}, {order.city}, {order.state} {order.zip}
                        </dd>
                        {order.notes && (
                          <>
                            <dt>Notes</dt>
                            <dd className="ad-pre">{order.notes}</dd>
                          </>
                        )}
                        <dt>Items</dt>
                        <dd>
                          {order.items.map((item) => (
                            <div key={item.productId}>
                              {item.qty}× {item.label} at {money(item.priceCents)}
                            </div>
                          ))}
                        </dd>
                      </dl>
                      <ContactButtons person={order} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function RequestCard({ request, onStatus }) {
  const phone = usePhone()
  if (phone) return <JobCard job={request} kind="request" onStatus={onStatus} />
  return (
    <article className={`ad-request ${request.status === 'handled' ? 'is-done' : ''}`}>
      <div className="ad-request-top">
        <b>{request.name}</b>
        <StatusPill status={request.status} kind="request" />
      </div>
      <small>
        {request.service || 'Message'} · {when(request.createdAt)} · {request.phone}
      </small>
      <p className="ad-pre">{request.message}</p>
      {request.photos.length > 0 && (
        <div className="ad-photos">
          {request.photos.map((photo) => (
            <a key={photo.id} href={photoUrl(photo.id)} target="_blank" rel="noreferrer" title={`Open ${photo.filename}`}>
              <img src={photoUrl(photo.id)} alt={`Photo from ${request.name}: ${photo.filename}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {request.photos.length > 0 && (
        <small className="ad-photo-count">
          <Camera size={14} aria-hidden="true" /> {request.photos.length} {request.photos.length === 1 ? 'photo' : 'photos'}. Click one to see it full size.
        </small>
      )}
      <div className="ad-request-actions">
        <ContactButtons person={request} compact />
        <StatusButton status={request.status} kind="request" onChange={(next) => onStatus(request.id, next)} />
      </div>
    </article>
  )
}
