import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, Moon, Phone, Sun, X } from 'lucide-react'
import { navLinks } from '../../data/siteInfo'
import { useContent } from '../../hooks/useContent'
import { useTheme } from '../../hooks/useTheme'
import brandLogo from '../../assets/images/brand-logo.webp'
import './Header.css'

export default function Header() {
  const { siteInfo } = useContent()
  const { pathname } = useLocation()
  // Remember which page the menu was opened on, so it closes itself after navigating.
  const [menuOpenOn, setMenuOpenOn] = useState(null)
  const menuOpen = menuOpenOn === pathname
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpenOn(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <img src={brandLogo} alt="Brad's Bees logo" className="brand-logo" />
          <span className="brand-name">{siteInfo.name}</span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="header-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
        >
          {menuOpen ? <X size={26} aria-hidden="true" /> : <Menu size={26} aria-hidden="true" />}
        </button>

        <div id="header-menu" className={`header-menu${menuOpen ? ' is-open' : ''}`}>
          <nav className="main-nav" aria-label="Main navigation">
            <ul>
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setMenuOpenOn(null)}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <a className="call-now" href={siteInfo.phoneHref}>
            <Phone size={18} aria-hidden="true" />
            Call Now
          </a>
        </div>

        <button
          type="button"
          className="theme-toggle"
          aria-pressed={isDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
