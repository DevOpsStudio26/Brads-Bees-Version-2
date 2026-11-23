import { useSearchParams } from 'react-router-dom'
import { useAdmin } from '../useAdmin'
import { Empty, FilterChips, PageTitle, RequestCard } from '../AdminParts'

const SHOW = ['all', 'new', 'handled']

export default function Requests() {
  const { requests, setRequestStatus } = useAdmin()
  const [params, setParams] = useSearchParams()
  const show = SHOW.includes(params.get('show')) ? params.get('show') : 'all'
  const count = (status) => requests.filter((r) => r.status === status).length
  const list = show === 'all' ? requests : requests.filter((r) => r.status === show)

  return (
    <>
      <PageTitle title="Requests" subtitle="Bee removals and other messages from the Contact page, with any photos the customer sent." />
      <FilterChips
        label="Show"
        value={show}
        onChange={(value) => setParams(value === 'all' ? {} : { show: value })}
        options={[
          { value: 'all', label: 'All', count: requests.length },
          { value: 'new', label: 'New', count: count('new') },
          { value: 'handled', label: 'Handled', count: count('handled') },
        ]}
      />
      <section className="ad-request-list">
        {list.length ? (
          list.map((r) => <RequestCard key={r.id} request={r} onStatus={setRequestStatus} />)
        ) : (
          <Empty>Nothing here yet. When someone sends the contact form, it shows up here.</Empty>
        )}
      </section>
    </>
  )
}
