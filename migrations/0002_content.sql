-- Website content Brad has changed from the admin page. One row per section
-- (products, siteInfo, gallery, testimonials, services, education), holding the
-- whole section as JSON. A section with no row shows the original content from
-- src/data/, so deleting a row puts that section back the way it was.

CREATE TABLE content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
