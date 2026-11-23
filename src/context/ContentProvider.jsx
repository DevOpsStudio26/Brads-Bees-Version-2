import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContentContext } from './ContentContext'
import { DEFAULT_CONTENT } from '../content/defaults'
import { fromStored } from '../content/assets'

// The website's content: the original from src/data/, with any section Brad
// changed in the admin swapped in. His changes come from /api/content and are
// remembered in this browser so the next visit shows them straight away.
const CACHE_KEY = 'brads-bees-content'

function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch {
    return {}
  }
}

function writeCache(changes) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(changes))
  } catch {
    // Storage can be full or blocked; the site still works without it.
  }
}

async function fetchChanges() {
  const response = await fetch('/api/content', { cache: 'no-cache' })
  if (!response.ok) throw new Error('Content not available')
  const data = await response.json()
  return data.content && typeof data.content === 'object' ? data.content : {}
}

function buildContent(changes) {
  const pick = (key) => (changes[key] ? fromStored(changes[key]) : DEFAULT_CONTENT[key])
  const products = pick('products')
  return {
    products,
    // Keep any original detail Brad's saved version doesn't have
    siteInfo: { ...DEFAULT_CONTENT.siteInfo, ...pick('siteInfo') },
    gallery: pick('gallery'),
    testimonials: pick('testimonials'),
    services: pick('services'),
    education: pick('education'),
    getProduct: (id) => products.find((product) => product.id === id),
    // Which sections Brad has changed
    changed: Object.keys(changes),
  }
}

export function ContentProvider({ children }) {
  const [changes, setChanges] = useState(readCache)

  const reloadContent = useCallback(async () => {
    const fresh = await fetchChanges()
    setChanges(fresh)
    writeCache(fresh)
  }, [])

  useEffect(() => {
    let active = true
    fetchChanges()
      .then((fresh) => {
        if (!active) return
        setChanges(fresh)
        writeCache(fresh)
      })
      .catch(() => {
        // Offline or the API isn't running: keep showing the content we have
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => ({ ...buildContent(changes), reloadContent }), [changes, reloadContent])
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}
