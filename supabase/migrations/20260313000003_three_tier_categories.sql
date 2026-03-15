-- Three-tier category system migration
-- Converts category enum → text, adds subcategory column,
-- maps existing org data to new category + subcategory values.

-- Step 1: Convert category column from enum to plain text
ALTER TABLE organizations ALTER COLUMN category TYPE text USING category::text;

-- Step 2: Add subcategory column
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subcategory text;

-- Step 3: Map old enum values → new category + subcategory
UPDATE organizations SET category = 'community', subcategory = 'church'
  WHERE category = 'churches';

UPDATE organizations SET category = 'community', subcategory = 'animal_welfare'
  WHERE category = 'animal-rescue';

UPDATE organizations SET category = 'community', subcategory = 'nonprofit'
  WHERE category = 'nonprofits';

UPDATE organizations SET category = 'community', subcategory = 'education'
  WHERE category = 'education';

UPDATE organizations SET category = 'community', subcategory = 'community_development'
  WHERE category = 'environment';

UPDATE organizations SET category = 'community', subcategory = 'community_development'
  WHERE category = 'local';

-- Step 4: Rows with 'political' tag become category='politics'
UPDATE organizations
  SET category = 'politics'
  WHERE tags @> ARRAY['political']::text[]
    AND category NOT IN ('community', 'missionaries', 'politics');

-- Step 5: Drop old enum type (no columns reference it anymore)
DROP TYPE IF EXISTS org_category;
