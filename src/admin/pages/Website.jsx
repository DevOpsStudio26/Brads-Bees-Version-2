import { ExternalLink } from 'lucide-react'
import { PageTitle } from '../AdminParts'
import ContactEditor from '../editors/ContactEditor'
import GalleryEditor from '../editors/GalleryEditor'
import ReviewsEditor from '../editors/ReviewsEditor'
import ServicesEditor from '../editors/ServicesEditor'
import EducationEditor from '../editors/EducationEditor'

// Every section of the public site. Each one saves on its own.
const SECTIONS = [
  { id: 'contact', title: 'Contact details & hours', href: '/contact', Editor: ContactEditor },
  { id: 'gallery', title: 'Gallery photos', href: '/gallery', Editor: GalleryEditor },
  { id: 'reviews', title: 'Customer reviews', href: '/', Editor: ReviewsEditor },
  { id: 'services', title: 'Services', href: '/services', Editor: ServicesEditor },
  { id: 'education', title: 'Education programs', href: '/education', Editor: EducationEditor },
]

export default function Website() {
  return (
    <>
      <PageTitle
        title="Website"
        subtitle="Change anything on the website. Each section has its own Save button, and nothing changes for visitors until you press it."
      >
        <a className="ad-btn is-line" href="/" target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          View the website
        </a>
      </PageTitle>

      <nav className="ad-jump" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>

      {SECTIONS.map(({ id, title, href, Editor }) => (
        <section key={id} className="ad-panel" aria-labelledby={id}>
          <div className="ad-panel-head">
            <h2 id={id}>{title}</h2>
            <a href={href} target="_blank" rel="noreferrer" className="ad-see">
              See it on the site <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
          <Editor />
        </section>
      ))}
    </>
  )
}
