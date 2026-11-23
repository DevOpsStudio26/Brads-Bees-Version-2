import { useState } from 'react'
import { useContent } from '../hooks/useContent'
import { DEFAULT_CONTENT } from '../content/defaults'
import { toStored } from '../content/assets'
import { adminApi } from './api'

const copy = (value) => structuredClone(value)

// For ItemTools: moves one item within a list being edited
export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
}

// Lists typed one item per line keep blank lines while typing; drop them when saving
function dropBlankLines(value) {
  if (Array.isArray(value)) {
    const items = value.map(dropBlankLines)
    return items.every((item) => typeof item === 'string') ? items.map((s) => s.trim()).filter(Boolean) : items
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, dropBlankLines(item)]))
  }
  return typeof value === 'string' ? value.trim() : value
}

// A working copy of one section of the website for an editor page.
//   change(draft => { draft[0].price = 12 })  edits the copy
//   save() puts it on the website, undo() throws away unsaved edits,
//   reset() puts the original content back
// prepare(value) can fill in details worked out from what Brad typed, just before saving.
export function useDraft(key, prepare = (value) => value) {
  const content = useContent()
  const live = content[key]
  const [draft, setDraft] = useState(() => copy(live))
  const [status, setStatus] = useState('clean') // clean | dirty | saving | saved | error
  const [error, setError] = useState('')
  const [seen, setSeen] = useState(live)

  // The live content arrived or changed while nothing was being edited: follow it
  if (live !== seen) {
    setSeen(live)
    if (status === 'clean' || status === 'saved') setDraft(copy(live))
  }

  function change(edit) {
    setDraft((current) => {
      const next = copy(current)
      edit(next)
      return next
    })
    setStatus('dirty')
  }

  async function run(work) {
    setStatus('saving')
    setError('')
    try {
      await work()
      await content.reloadContent()
      setStatus('saved')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const save = () =>
    run(async () => {
      const value = prepare(dropBlankLines(copy(draft)))
      await adminApi.saveContent(key, toStored(value))
      setDraft(value)
    })

  const reset = () =>
    run(async () => {
      await adminApi.saveContent(key, null)
      setDraft(copy(DEFAULT_CONTENT[key]))
    })

  function undo() {
    setDraft(copy(live))
    setStatus('clean')
    setError('')
  }

  return { draft, change, save, undo, reset, status, error, changed: content.changed.includes(key) }
}
