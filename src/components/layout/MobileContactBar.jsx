import { MessageSquare, Phone } from 'lucide-react'
import { useContent } from '../../hooks/useContent'
import './MobileContactBar.css'

// Call and Text buttons pinned to the bottom of the screen on phones
export default function MobileContactBar() {
  const { siteInfo } = useContent()
  return (
    <nav className="mobile-contact-bar" aria-label="Contact Brad's Bees">
      <a className="mobile-contact-call" href={siteInfo.phoneHref}>
        <Phone aria-hidden="true" />
        Call
      </a>
      <a className="mobile-contact-text" href={siteInfo.smsHref}>
        <MessageSquare aria-hidden="true" />
        Text
      </a>
    </nav>
  )
}
