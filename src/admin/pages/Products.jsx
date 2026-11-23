import { ExternalLink, Plus } from 'lucide-react'
import { PageTitle } from '../AdminParts'
import { Area, Choice, Field, ImageField, ItemTools, NumberField, SaveBar, Toggle } from '../EditParts'
import { moveItem, useDraft } from '../useDraft'
import { assetUrl } from '../../content/assets'

const FITS = [
  { value: 'cover', label: 'Fill the frame' },
  { value: 'tall', label: 'Show the whole jar (tall)' },
  { value: 'pint', label: 'Show the whole jar (short)' },
]

// Brad's shop products: prices, stock, photos, words, and adding or removing products
export default function Products() {
  const d = useDraft('products')
  const products = d.draft
  const set = (i, field) => (value) => d.change((list) => void (list[i][field] = value))

  function addProduct() {
    d.change((list) =>
      list.push({
        id: `product-${Date.now().toString(36)}`,
        name: 'New product',
        variant: '',
        price: 10,
        rating: 5,
        inStock: false,
        imageFit: 'cover',
        description: '',
        image: assetUrl('images/honey-preview.webp'),
      }),
    )
  }

  return (
    <>
      <PageTitle
        title="Products"
        subtitle="Change prices, photos and words, mark things sold out, or add a product. Nothing changes on the shop until you press Save."
      >
        <a className="ad-btn is-line" href="/shop" target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          View the shop
        </a>
      </PageTitle>

      <SaveBar d={d} what="the products" />

      <div className="ad-edit-list">
        {products.map((p, i) => (
          <article key={p.id} className="ad-edit-card">
            <ImageField value={p.image} onChange={set(i, 'image')} />
            <div className="ad-edit-fields">
              <div className="ad-field-row">
                <Field label="Name" value={p.name} onChange={set(i, 'name')} maxLength={100} />
                <Field label="Size" value={p.variant} onChange={set(i, 'variant')} maxLength={60} hint="Like Pint or 1 lb Block. Can be left blank." />
              </div>
              <div className="ad-field-row">
                <NumberField label="Price ($)" value={p.price} onChange={set(i, 'price')} min={0} step={0.01} />
                <NumberField label="Star rating (0 to 5)" value={p.rating} onChange={set(i, 'rating')} min={0} max={5} step={0.1} />
                <Choice label="Photo" value={p.imageFit} onChange={set(i, 'imageFit')} options={FITS} />
              </div>
              <Area label="Description" value={p.description} onChange={set(i, 'description')} />
              <div className="ad-edit-foot">
                <Toggle label={`${p.name} in stock`} on={p.inStock} onChange={set(i, 'inStock')} onText="In stock" offText="Sold out" />
                {products.length > 1 && (
                  <ItemTools
                    index={i}
                    count={products.length}
                    what={p.name}
                    onMove={(from, to) => d.change((list) => moveItem(list, from, to))}
                    onRemove={(index) => d.change((list) => void list.splice(index, 1))}
                  />
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="ad-btn is-dark ad-add" onClick={addProduct}>
        <Plus size={16} aria-hidden="true" />
        Add a product
      </button>
      <p className="ad-hint">New products start as Sold out, so they don't go on sale until you're ready.</p>
    </>
  )
}
