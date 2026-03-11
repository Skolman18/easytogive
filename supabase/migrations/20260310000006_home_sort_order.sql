ALTER TABLE organizations ADD COLUMN IF NOT EXISTS home_sort_order int DEFAULT 0;
-- Seed home_sort_order from existing sort_order so the initial order matches
UPDATE organizations SET home_sort_order = sort_order;
