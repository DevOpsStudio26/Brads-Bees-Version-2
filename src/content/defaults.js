// The website's original content, from src/data/. Any section Brad hasn't
// changed in the admin shows exactly this.
import { products } from '../data/products'
import { siteInfo } from '../data/siteInfo'
import { galleryCategories, galleryPhotos } from '../data/gallery'
import { testimonials } from '../data/testimonials'
import { serviceTabs } from '../data/services'
import { educationPrograms, learningTopics } from '../data/education'

export const DEFAULT_CONTENT = {
  products,
  siteInfo,
  gallery: { categories: galleryCategories, photos: galleryPhotos },
  testimonials,
  services: serviceTabs,
  education: { programs: educationPrograms, topics: learningTopics },
}
