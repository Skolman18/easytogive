-- Allow donations without a single org_id (e.g. portfolio / multi-org donations)
ALTER TABLE donations ALTER COLUMN org_id DROP NOT NULL;

-- Drop the FK constraint so org_id can also be null
-- (constraint name may vary — use IF EXISTS pattern)
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_org_id_fkey;

-- Re-add as nullable FK so existing linked donations still reference their org
ALTER TABLE donations
  ADD CONSTRAINT donations_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id)
  ON DELETE SET NULL;
