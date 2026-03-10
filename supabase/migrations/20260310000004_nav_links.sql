CREATE TABLE IF NOT EXISTS nav_links (
  id serial PRIMARY KEY,
  href text NOT NULL,
  label text NOT NULL,
  sort_order int DEFAULT 0,
  visible boolean DEFAULT true
);

INSERT INTO nav_links (href, label, sort_order, visible) VALUES
  ('/discover', 'Discover', 0, true),
  ('/missionaries', 'Missionaries', 1, true),
  ('/portfolio', 'My Portfolio', 2, true),
  ('/about', 'About', 3, true),
  ('/profile', 'Profile', 4, true)
ON CONFLICT DO NOTHING;

ALTER TABLE nav_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "nav_links_public_read" ON nav_links FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nav_links_admin_all" ON nav_links FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
