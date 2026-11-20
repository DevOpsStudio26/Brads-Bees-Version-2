import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'
const THEME_COLORS = { light: '#d98500', dark: '#161a22' }

// index.html sets data-theme before React loads (saved choice, else the
// device setting), so start from whatever it picked.
function getInitialTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Private browsing can block storage; the theme still works for this visit.
    }
  }, [theme])

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  return { theme, toggleTheme }
}
