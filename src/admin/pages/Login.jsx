import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import brandLogo from '../../assets/images/brand-logo.webp'
import { adminApi } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    let active = true
    adminApi
      .me()
      .then(() => active && navigate('/admin', { replace: true }))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!password) {
      setError('Type your password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminApi.login(password, remember)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={handleSubmit} noValidate>
        <div className="ad-login-top">
          <img src={brandLogo} alt="Brad's Bees logo" />
          <h1>Brad's Bees Admin</h1>
          <p>Only Brad can sign in here.</p>
        </div>
        <div className="ad-field">
          <label htmlFor="admin-password">Password</label>
          <div className="ad-password">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-login-error' : undefined}
              autoFocus
            />
            <button
              type="button"
              className="ad-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-pressed={showPassword}
              aria-controls="admin-password"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <label className="ad-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in on this device for 30 days
        </label>
        {error && (
          <p className="ad-form-error" id="admin-login-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="ad-btn is-gold is-big" disabled={busy}>
          <Lock size={16} aria-hidden="true" />
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <Link to="/" className="ad-back">
          Back to the website
        </Link>
      </form>
    </div>
  )
}
