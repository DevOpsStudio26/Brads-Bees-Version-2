import { Plus } from 'lucide-react'
import { Area, Field, ImageField, ItemTools, Lines, SaveBar } from '../EditParts'
import { moveItem, useDraft } from '../useDraft'
import { assetUrl } from '../../content/assets'

export default function EducationEditor() {
  const d = useDraft('education')
  const { programs, topics } = d.draft

  return (
    <div className="ad-editor">
      <SaveBar d={d} what="the education programs" />

      <fieldset className="ad-fieldset">
        <legend>Programs ({programs.length})</legend>
        {programs.map((p, i) => (
          <div key={i} className="ad-edit-card is-flat">
            <ImageField label="Icon" small value={p.icon} onChange={(v) => d.change((x) => void (x.programs[i].icon = v))} />
            <div className="ad-edit-fields">
              <Field label="Program name" value={p.title} onChange={(v) => d.change((x) => void (x.programs[i].title = v))} maxLength={80} />
              <Area label="Description" value={p.description} onChange={(v) => d.change((x) => void (x.programs[i].description = v))} />
              <Lines label="Highlights" value={p.highlights} onChange={(v) => d.change((x) => void (x.programs[i].highlights = v))} />
              <ItemTools
                index={i}
                count={programs.length}
                what={p.title}
                onMove={(from, to) => d.change((x) => moveItem(x.programs, from, to))}
                onRemove={(index) => d.change((x) => void x.programs.splice(index, 1))}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="ad-btn is-line is-small ad-add"
          onClick={() =>
            d.change((x) => void x.programs.push({ icon: assetUrl('images/icon-calendar.webp'), title: 'New program', description: '', highlights: [] }))
          }
        >
          <Plus size={15} aria-hidden="true" />
          Add a program
        </button>
      </fieldset>

      <fieldset className="ad-fieldset">
        <legend>What visitors learn ({topics.length} topics)</legend>
        <div className="ad-field-row is-wrap">
          {topics.map((t, i) => (
            <div key={i} className="ad-field-stack ad-edit-block">
              <Field label="Topic" value={t.title} onChange={(v) => d.change((x) => void (x.topics[i].title = v))} maxLength={80} />
              <Lines label="Points" value={t.points} onChange={(v) => d.change((x) => void (x.topics[i].points = v))} />
              <ItemTools
                index={i}
                count={topics.length}
                what={t.title}
                onMove={(from, to) => d.change((x) => moveItem(x.topics, from, to))}
                onRemove={(index) => d.change((x) => void x.topics.splice(index, 1))}
              />
            </div>
          ))}
        </div>
        <button type="button" className="ad-btn is-line is-small ad-add" onClick={() => d.change((x) => void x.topics.push({ title: 'New topic', points: [] }))}>
          <Plus size={15} aria-hidden="true" />
          Add a topic
        </button>
      </fieldset>
    </div>
  )
}
