import { Link } from 'react-router-dom'
import { siteInfo } from '../data/siteInfo'
import './NotFound.css'

// Shown for any address that isn't a real page
export default function NotFound() {
  return (
    <section className="not-found">
      <title>Page Not Found - Brad&apos;s Bees</title>
      <meta name="robots" content="noindex" />

      <div className="not-found-hex" aria-hidden="true">
        🐝
      </div>
      <h1>This Page Has Flown Away</h1>
      <p>We couldn&rsquo;t find the page you were looking for. It may have moved or never existed.</p>
      <div className="not-found-actions">
        <Link to="/" className="not-found-primary">
          Back to Home
        </Link>
        <a href={siteInfo.phoneHref} className="not-found-secondary">
          Call {siteInfo.phone}
        </a>
      </div>
    </section>
  )
}
