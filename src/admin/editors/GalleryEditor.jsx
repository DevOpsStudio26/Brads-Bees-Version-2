import { useState } from 'react'
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import { FilterChips } from '../AdminParts'
import { AddPhotos, SaveBar } from '../EditParts'
import { moveItem, useDraft } from '../useDraft'

export default function GalleryEditor() {
  const d = useDraft('gallery')
  const { categories, photos } = d.draft
  const [show, setShow] = useState('All')
  const [confirmId, setConfirmId] = useState(null)

  const visible = photos.map((photo, index) => ({ photo, index })).filter(({ photo }) => show === 'All' || photo.category === show)

  function addPhotos(urls) {
    d.change((draft) => {
      let id = Math.max(0, ...draft.photos.map((p) => p.id)) + 1
      for (const src of urls) {
        draft.photos.push({ id, src, alt: `Brad's Bees gallery photo ${id}`, category: show === 'All' ? categories[0] : show })
        id += 1
      }
    })
  }

  return (
    <div className="ad-editor">
      <SaveBar d={d} what="the gallery photos" />
      <div className="ad-editor-tools">
        <FilterChips
          label="Show photos"
          value={show}
          onChange={setShow}
          options={['All', ...categories].map((c) => ({
            value: c,
            label: c,
            count: c === 'All' ? photos.length : photos.filter((p) => p.category === c).length,
          }))}
        />
        <AddPhotos onAdd={addPhotos} label={show === 'All' ? 'Add photos' : `Add ${show} photos`} />
      </div>
      <p className="ad-hint">New photos go at the end. Use the arrows to move a photo earlier or later in the gallery.</p>

      <div className="ad-gallery is-edit">
        {visible.map(({ photo, index }) => (
          <figure key={photo.id}>
            <a href={photo.src} target="_blank" rel="noreferrer" title="Open full size">
              <img src={photo.src} alt={photo.alt} loading="lazy" />
            </a>
            <label className="sr-only" htmlFor={`cat-${photo.id}`}>
              Group for photo {index + 1}
            </label>
            <select
              id={`cat-${photo.id}`}
              value={photo.category}
              onChange={(e) => d.change((draft) => void (draft.photos[index].category = e.target.value))}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="ad-photo-tools">
              <button type="button" className="ad-btn is-soft is-small" onClick={() => d.change((draft) => moveItem(draft.photos, index, index - 1))} disabled={index === 0} aria-label={`Move photo ${index + 1} earlier`}>
                <ArrowLeft size={14} aria-hidden="true" />
              </button>
              <button type="button" className="ad-btn is-soft is-small" onClick={() => d.change((draft) => moveItem(draft.photos, index, index + 1))} disabled={index === photos.length - 1} aria-label={`Move photo ${index + 1} later`}>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
              {confirmId === photo.id ? (
                <button
                  type="button"
                  className="ad-btn is-danger is-small"
                  onClick={() => {
                    setConfirmId(null)
                    d.change((draft) => void draft.photos.splice(index, 1))
                  }}
                >
                  Remove?
                </button>
              ) : (
                <button type="button" className="ad-btn is-line is-small" onClick={() => setConfirmId(photo.id)} aria-label={`Remove photo ${index + 1}`}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </figure>
        ))}
      </div>
    </div>
  )
}
