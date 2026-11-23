import { Plus } from 'lucide-react'
import { Area, Field, ItemTools, SaveBar } from '../EditParts'
import { moveItem, useDraft } from '../useDraft'

// The Call / Text buttons and the map link are worked out from what Brad types
function withLinks(info) {
  const digits = info.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  return {
    ...info,
    phoneHref: `tel:+1${digits}`,
    smsHref: `sms:+1${digits}`,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.cityStateZip).replace(/%20/g, '+')}`,
  }
}

export default function ContactEditor() {
  const d = useDraft('siteInfo', withLinks)
  const info = d.draft
  const set = (field) => (value) => d.change((draft) => void (draft[field] = value))

  return (
    <div className="ad-editor">
      <SaveBar d={d} what="the contact details" />
      <div className="ad-field-row">
        <Field label="Business name" value={info.name} onChange={set('name')} maxLength={60} />
        <Field label="Town" value={info.cityStateZip} onChange={set('cityStateZip')} maxLength={80} hint="The map link follows this." />
      </div>
      <div className="ad-field-row">
        <Field label="Phone number" value={info.phone} onChange={set('phone')} maxLength={20} hint="The Call and Text buttons follow this." />
        <Field label="Under the phone number" value={info.phoneAvailability} onChange={set('phoneAvailability')} maxLength={80} />
      </div>
      <div className="ad-field-row">
        <Field label="Email" type="email" value={info.email} onChange={set('email')} maxLength={200} />
        <Field label="Under the email" value={info.emailResponse} onChange={set('emailResponse')} maxLength={80} />
      </div>

      <fieldset className="ad-fieldset">
        <legend>Opening hours</legend>
        {info.hours.map((h, i) => (
          <div key={i} className="ad-field-row is-tools">
            <Field label="Days" value={h.days} onChange={(v) => d.change((draft) => void (draft.hours[i].days = v))} maxLength={40} />
            <Field label="Hours" value={h.time} onChange={(v) => d.change((draft) => void (draft.hours[i].time = v))} maxLength={60} />
            <ItemTools
              index={i}
              count={info.hours.length}
              what={h.days}
              onMove={(from, to) => d.change((draft) => moveItem(draft.hours, from, to))}
              onRemove={(index) => d.change((draft) => void draft.hours.splice(index, 1))}
            />
          </div>
        ))}
        <button type="button" className="ad-btn is-line is-small ad-add" onClick={() => d.change((draft) => void draft.hours.push({ days: '', time: '' }))}>
          <Plus size={15} aria-hidden="true" />
          Add a line
        </button>
      </fieldset>

      <Area label="Short description (in the footer)" value={info.summary} onChange={set('summary')} rows={2} />
      <Field label="Tagline (in the footer)" value={info.tagline} onChange={set('tagline')} maxLength={160} />
      <div className="ad-field-row">
        <Field label="Facebook page link" type="url" value={info.facebook} onChange={set('facebook')} hint="Starts with https://" />
        <Field label="Charity name" value={info.community.label} onChange={(v) => d.change((draft) => void (draft.community.label = v))} maxLength={80} />
        <Field label="Charity link" type="url" value={info.community.url} onChange={(v) => d.change((draft) => void (draft.community.url = v))} hint="Starts with https://" />
      </div>
      <Field label="Bottom line of the footer" value={info.footerNote} onChange={set('footerNote')} maxLength={160} />
    </div>
  )
}
