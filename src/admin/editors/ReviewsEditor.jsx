import { Plus } from 'lucide-react'
import { Area, Choice, Field, ItemTools, SaveBar } from '../EditParts'
import { moveItem, useDraft } from '../useDraft'

const RATINGS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map((n) => ({ value: String(n), label: `${n} stars` }))

// "Landon Price" -> "LP", for the circle next to each review
const initialsOf = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function ReviewsEditor() {
  const d = useDraft('testimonials')
  const reviews = d.draft
  const set = (i, field) => (value) => d.change((list) => void (list[i][field] = value))

  return (
    <div className="ad-editor">
      <SaveBar d={d} what="the reviews" />
      {reviews.map((r, i) => (
        <div key={i} className="ad-edit-block">
          <div className="ad-field-row">
            <Field
              label="Name"
              value={r.name}
              maxLength={60}
              onChange={(v) =>
                d.change((list) => {
                  list[i].name = v
                  list[i].initials = initialsOf(v)
                })
              }
            />
            <Field label="Town" value={r.location} onChange={set(i, 'location')} maxLength={60} />
            <Field label="What Brad helped with" value={r.service} onChange={set(i, 'service')} maxLength={60} />
            <Choice label="Rating" value={String(r.rating)} onChange={(v) => set(i, 'rating')(Number(v))} options={RATINGS} />
          </div>
          <Area label="What they said" value={r.quote} onChange={set(i, 'quote')} rows={3} />
          <ItemTools
            index={i}
            count={reviews.length}
            what={`${r.name}'s review`}
            onMove={(from, to) => d.change((list) => moveItem(list, from, to))}
            onRemove={(index) => d.change((list) => void list.splice(index, 1))}
          />
        </div>
      ))}
      <button
        type="button"
        className="ad-btn is-dark ad-add"
        onClick={() => d.change((list) => void list.push({ name: '', initials: '', location: '', rating: 5, service: '', quote: '' }))}
      >
        <Plus size={16} aria-hidden="true" />
        Add a review
      </button>
    </div>
  )
}
