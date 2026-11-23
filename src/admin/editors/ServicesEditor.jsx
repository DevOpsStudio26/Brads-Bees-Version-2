import { Area, Field, ImageField, Lines, SaveBar } from '../EditParts'
import { useDraft } from '../useDraft'

// Each service is one tab on the Services page. Every bit of wording and the
// big photo can be changed; the small icons stay as they are.
export default function ServicesEditor() {
  const d = useDraft('services')
  const services = d.draft
  // edit(i, s => { s.hero.title = v }) changes service i
  const edit = (i, fn) => d.change((list) => fn(list[i]))

  return (
    <div className="ad-editor">
      <SaveBar d={d} what="the services" />
      {services.map((s, i) => (
        <details key={s.id} className="ad-details-block" open={i === 0}>
          <summary>{s.label}</summary>
          <div className="ad-details-body">
            <div className="ad-edit-card is-flat">
              <ImageField value={s.hero.image} onChange={(v) => edit(i, (x) => void (x.hero.image = v))} />
              <div className="ad-edit-fields">
                <div className="ad-field-row">
                  <Field label="Tab name" value={s.label} onChange={(v) => edit(i, (x) => void (x.label = v))} maxLength={60} />
                  <Field label="Heading" value={s.hero.title} onChange={(v) => edit(i, (x) => void (x.hero.title = v))} maxLength={100} />
                </div>
                <Area label="Intro" value={s.hero.text} onChange={(v) => edit(i, (x) => void (x.hero.text = v))} />
              </div>
            </div>

            <fieldset className="ad-fieldset">
              <legend>Highlights ({s.features.length})</legend>
              {s.features.map((f, n) => (
                <div key={n} className="ad-field-row">
                  <Field label={`Highlight ${n + 1}`} value={f.title} onChange={(v) => edit(i, (x) => void (x.features[n].title = v))} maxLength={60} />
                  <Field label="Details" value={f.text} onChange={(v) => edit(i, (x) => void (x.features[n].text = v))} maxLength={200} />
                </div>
              ))}
            </fieldset>

            {s.process && (
              <fieldset className="ad-fieldset">
                <legend>Steps</legend>
                <Field label="Steps heading" value={s.process.title} onChange={(v) => edit(i, (x) => void (x.process.title = v))} maxLength={100} />
                {s.process.steps.map((step, n) => (
                  <div key={n} className="ad-field-row">
                    <Field label={`Step ${n + 1}`} value={step.title} onChange={(v) => edit(i, (x) => void (x.process.steps[n].title = v))} maxLength={60} />
                    <Field label="Details" value={step.text} onChange={(v) => edit(i, (x) => void (x.process.steps[n].text = v))} maxLength={300} />
                  </div>
                ))}
              </fieldset>
            )}

            {s.crops && (
              <fieldset className="ad-fieldset">
                <legend>Crops</legend>
                <div className="ad-field-row">
                  <Field label="Crops heading" value={s.crops.title} onChange={(v) => edit(i, (x) => void (x.crops.title = v))} maxLength={100} />
                  <Field label="Under the heading" value={s.crops.text} onChange={(v) => edit(i, (x) => void (x.crops.text = v))} maxLength={200} />
                </div>
                <div className="ad-field-row">
                  {s.crops.groups.map((g, n) => (
                    <div key={n} className="ad-field-stack">
                      <Field label={`Group ${n + 1}`} value={g.title} onChange={(v) => edit(i, (x) => void (x.crops.groups[n].title = v))} maxLength={60} />
                      <Lines label="Crops" value={g.items} onChange={(v) => edit(i, (x) => void (x.crops.groups[n].items = v))} />
                    </div>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="ad-fieldset">
              <legend>Price box</legend>
              <div className="ad-field-row">
                <Field label="Above the box" value={s.package.heading} onChange={(v) => edit(i, (x) => void (x.package.heading = v))} maxLength={100} />
                <Field label="Box title" value={s.package.title} onChange={(v) => edit(i, (x) => void (x.package.title = v))} maxLength={100} />
                <Field label="Price" value={s.package.price} onChange={(v) => edit(i, (x) => void (x.package.price = v))} maxLength={40} hint="Like On Request or $150" />
              </div>
              <Lines label="What's included" value={s.package.items} onChange={(v) => edit(i, (x) => void (x.package.items = v))} />
            </fieldset>

            <fieldset className="ad-fieldset">
              <legend>Call to action at the bottom</legend>
              <div className="ad-field-row">
                <Field label="Heading" value={s.cta.title} onChange={(v) => edit(i, (x) => void (x.cta.title = v))} maxLength={100} />
                <Field label="Under the heading" value={s.cta.text} onChange={(v) => edit(i, (x) => void (x.cta.text = v))} maxLength={200} />
              </div>
            </fieldset>
          </div>
        </details>
      ))}
    </div>
  )
}
