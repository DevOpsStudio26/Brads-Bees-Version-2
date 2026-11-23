-- Saved orders and contact requests for the admin page.
-- Money is stored in cents so totals never pick up rounding errors.
-- Apply locally:   npm run db:setup:local
-- Apply for real:  npm run db:setup:remote

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ready', 'done')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  qty INTEGER NOT NULL
);

CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL
);

-- The photo files themselves live in the R2 bucket under r2_key
CREATE TABLE request_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests (id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL
);

CREATE INDEX orders_created ON orders (created_at);
CREATE INDEX order_items_order ON order_items (order_id);
CREATE INDEX requests_created ON requests (created_at);
CREATE INDEX request_photos_request ON request_photos (request_id);
