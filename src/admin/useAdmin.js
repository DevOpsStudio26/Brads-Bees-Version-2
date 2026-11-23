import { useOutletContext } from 'react-router-dom'

// Orders, requests and actions loaded by AdminLayout, shared with every admin page:
// { orders, requests, setOrderStatus(id, status), setRequestStatus(id, status), reload() }
export function useAdmin() {
  return useOutletContext()
}
