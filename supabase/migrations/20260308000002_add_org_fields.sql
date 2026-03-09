-- Add recommended_orgs and sort_order columns to organizations table
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS recommended_orgs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Index for sort_order so homepage queries are fast
CREATE INDEX IF NOT EXISTS organizations_sort_order_idx ON organizations (sort_order ASC);
