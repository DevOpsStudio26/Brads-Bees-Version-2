import { useId, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ImageUp, LoaderCircle, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { adminApi } from './api'

/* ---------- Text boxes ---------- */

export function Field({ label, value, onChange, hint, type = 'text', ...rest }) {
  const id = useId()
  return (
    <div className="ad-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <small className="ad-hint">{hint}</small>}
    </div>
  )
}

export function NumberField({ label, value, onChange, ...rest }) {
  const id = useId()
  return (
    <div className="ad-field is-number">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        {...rest}
      />
    </div>
  )
}

export function Area({ label, value, onChange, rows = 3, hint }) {
  const id = useId()
  return (
    <div className="ad-field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {hint && <small className="ad-hint">{hint}</small>}
    </div>
  )
}

// A list of short lines, typed one per line
export function Lines({ label, value, onChange, rows }) {
  return (
    <Area
      label={label}
      rows={rows ?? Math.max(3, value.length + 1)}
      value={value.join('\n')}
      onChange={(text) => onChange(text.split('\n'))}
      hint="One per line."
    />
  )
}

export function Choice({ label, value, onChange, options }) {
  const id = useId()
  return (
    <div className="ad-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Toggle({ label, on, onChange, onText, offText }) {
  return (
    <button type="button" className="ad-switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <i aria-hidden="true" />
      {on ? onText : offText}
    </button>
  )
}

/* ---------- Photos ---------- */

export function ImageField({ label = 'Photo', value, onChange, small = false }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function choose(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await adminApi.uploadImage(file)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`ad-image-field ${small ? 'is-small' : ''}`}>
      <div className="ad-image-preview">{value ? <img src={value} alt="" /> : <span>No photo</span>}</div>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only ad-file" onChange={choose} disabled={busy} />
      <label htmlFor={id} className="ad-btn is-line is-small">
        {busy ? <LoaderCircle size={15} className="ad-spin" aria-hidden="true" /> : <ImageUp size={15} aria-hidden="true" />}
        {busy ? 'Uploading…' : `Change ${label.toLowerCase()}`}
      </label>
      {error && (
        <small className="ad-field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}

// Adds several photos at once; onAdd(urls) gets the uploaded addresses
export function AddPhotos({ onAdd, label = 'Add photos' }) {
  const id = useId()
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  async function choose(event) {
    const files = [...event.target.files]
    event.target.value = ''
    if (!files.length) return
    setError('')
    const urls = []
    for (const [n, file] of files.entries()) {
      setProgress(`Uploading ${n + 1} of ${files.length}…`)
      try {
        urls.push((await adminApi.uploadImage(file)).url)
      } catch (err) {
        setError(`${file.name}: ${err.message}`)
      }
    }
    setProgress('')
    if (urls.length) onAdd(urls)
  }

  return (
    <div className="ad-add-photos">
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only ad-file" onChange={choose} disabled={Boolean(progress)} />
      <label htmlFor={id} className="ad-btn is-dark">
        <ImageUp size={16} aria-hidden="true" />
        {progress || label}
      </label>
      {error && (
        <small className="ad-field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}

/* ---------- Lists ---------- */

// Move up / Move down / Remove (asks once more before removing)
export function ItemTools({ index, count, onMove, onRemove, what = 'this' }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="ad-item-tools">
      <button type="button" className="ad-btn is-soft is-small" onClick={() => onMove(index, index - 1)} disabled={index === 0} aria-label={`Move ${what} up`}>
        <ArrowUp size={15} aria-hidden="true" />
      </button>
      <button type="button" className="ad-btn is-soft is-small" onClick={() => onMove(index, index + 1)} disabled={index === count - 1} aria-label={`Move ${what} down`}>
        <ArrowDown size={15} aria-hidden="true" />
      </button>
      {confirming ? (
        <>
          <button type="button" className="ad-btn is-danger is-small" onClick={() => onRemove(index)}>
            Yes, remove
          </button>
          <button type="button" className="ad-btn is-line is-small" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" className="ad-btn is-line is-small" onClick={() => setConfirming(true)}>
          <Trash2 size={15} aria-hidden="true" />
          Remove
        </button>
      )}
    </div>
  )
}

/* ---------- Save bar ---------- */

// d: what useDraft returns
export function SaveBar({ d, what }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const { status } = d

  return (
    <div className={`ad-savebar is-${status}`} role="status">
      <span className="ad-savebar-text">
        {status === 'dirty' && 'You have unsaved changes.'}
        {status === 'saving' && (
          <>
            <LoaderCircle size={16} className="ad-spin" aria-hidden="true" /> Saving…
          </>
        )}
        {status === 'saved' && (
          <>
            <Check size={16} aria-hidden="true" /> Saved. The website now shows your changes.
          </>
        )}
        {status === 'error' && `Not saved: ${d.error}`}
        {status === 'clean' && (d.changed ? `You've changed ${what} before. It's live on the website.` : `${what[0].toUpperCase()}${what.slice(1)} are the original ones.`)}
      </span>
      <span className="ad-savebar-actions">
        {(status === 'dirty' || status === 'error') && (
          <>
            <button type="button" className="ad-btn is-line is-small" onClick={d.undo}>
              <Undo2 size={15} aria-hidden="true" />
              Undo
            </button>
            <button type="button" className="ad-btn is-gold is-small" onClick={d.save}>
              <Check size={15} aria-hidden="true" />
              Save changes
            </button>
          </>
        )}
        {(status === 'clean' || status === 'saved') &&
          d.changed &&
          (confirmReset ? (
            <>
              <button
                type="button"
                className="ad-btn is-danger is-small"
                onClick={() => {
                  setConfirmReset(false)
                  d.reset()
                }}
              >
                Yes, put the original back
              </button>
              <button type="button" className="ad-btn is-line is-small" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="ad-btn is-line is-small" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} aria-hidden="true" />
              Reset to original
            </button>
          ))}
      </span>
    </div>
  )
}
