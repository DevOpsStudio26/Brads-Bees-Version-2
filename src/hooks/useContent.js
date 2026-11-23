import { useContext } from 'react'
import { ContentContext } from '../context/ContentContext'

// { products, siteInfo, gallery, testimonials, services, education, getProduct, changed, reloadContent }
export function useContent() {
  return useContext(ContentContext)
}
