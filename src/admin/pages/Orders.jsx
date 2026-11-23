import { useSearchParams } from 'react-router-dom'
import { useAdmin } from '../useAdmin'
import { FilterChips, OrderTable, PageTitle } from '../AdminParts'

const SHOW = ['all', 'new', 'ready', 'done']

export default function Orders() {
  const { orders, setOrderStatus } = useAdmin()
  const [params, setParams] = useSearchParams()
  const show = SHOW.includes(params.get('show')) ? params.get('show') : 'all'
  const count = (status) => orders.filter((o) => o.status === status).length
  const list = show === 'all' ? orders : orders.filter((o) => o.status === show)

  return (
    <>
      <PageTitle title="Orders" subtitle="Every order from the shop, newest first. Press the button to move an order along." />
      <FilterChips
        label="Show"
        value={show}
        onChange={(value) => setParams(value === 'all' ? {} : { show: value })}
        options={[
          { value: 'all', label: 'All', count: orders.length },
          { value: 'new', label: 'New', count: count('new') },
          { value: 'ready', label: 'Ready', count: count('ready') },
          { value: 'done', label: 'Done', count: count('done') },
        ]}
      />
      <section className="ad-panel">
        <OrderTable orders={list} onStatus={setOrderStatus} />
      </section>
    </>
  )
}
