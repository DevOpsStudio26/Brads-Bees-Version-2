import { useSyncExternalStore } from 'react'

// Phone-sized screens get the phone-app layout: tabs along the bottom and
// cards instead of tables. Keep in step with the 700px rules in admin.css.
const QUERY = '(max-width: 700px)'

function subscribe(onChange) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const isPhone = () => window.matchMedia(QUERY).matches

export function usePhone() {
  return useSyncExternalStore(subscribe, isPhone, () => false)
}
