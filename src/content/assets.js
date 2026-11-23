// Every picture bundled with the site, so content Brad saves can refer to one
// by name ("asset:images/hive.webp") instead of by its built file address,
// which changes every time the site is rebuilt.

const files = import.meta.glob('../assets/**/*.{webp,png,jpg,jpeg,svg}', { eager: true, import: 'default' })

const urlByName = {}
const nameByUrl = {}
for (const [path, url] of Object.entries(files)) {
  const name = path.replace('../assets/', '')
  urlByName[name] = url
  nameByUrl[url] = name
}

export const assetUrl = (name) => urlByName[name] ?? ''

function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value)
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fn))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, fn)]))
  }
  return value
}

// Before saving: bundled picture addresses become "asset:<name>"
export const toStored = (value) => mapStrings(value, (s) => (nameByUrl[s] ? `asset:${nameByUrl[s]}` : s))

// After loading: "asset:<name>" becomes the picture's address in this build
export const fromStored = (value) => mapStrings(value, (s) => (s.startsWith('asset:') ? assetUrl(s.slice(6)) : s))
