-- ─────────────────────────────────────────────────────────────
-- Section 3: Remove fake/placeholder organizations
-- ─────────────────────────────────────────────────────────────

DELETE FROM organizations WHERE image_url LIKE '%unsplash.com%';

DELETE FROM organizations WHERE id IN (
  'clean-rivers-project',
  'eastside-community-fund',
  'literacy-first',
  'second-chance-rescue',
  'grace-community-church',
  'highland-presbyterian',
  'bethel-tabernacle',
  'ocean-keepers',
  'stem-for-all',
  'urban-tree-canopy',
  'paws-and-claws',
  'neighbors-helping-neighbors'
);

-- ─────────────────────────────────────────────────────────────
-- Section 9: Fix data quality issues
-- ─────────────────────────────────────────────────────────────

-- Fix "America" / "USA" / "US" location values
UPDATE organizations
SET location = 'United States'
WHERE LOWER(TRIM(location)) IN ('america', 'usa', 'us');

-- Fix Riverstone Church slug typo (id and slug)
UPDATE organizations SET id = 'riverstone-church'   WHERE id   = 'riverstoen_church';
UPDATE organizations SET id = 'riverstone-church'   WHERE id   = 'riverstoen-church';
UPDATE organizations SET slug = 'riverstone-church' WHERE slug = 'riverstoen_church';
UPDATE organizations SET slug = 'riverstone-church' WHERE slug = 'riverstoen-church';

-- ─────────────────────────────────────────────────────────────
-- Section 16: Terms acceptance columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version text DEFAULT '2026-03';
