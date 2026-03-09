-- ============================================================
-- Sections 2–8 migrations
-- ============================================================

-- 1. Organizations: new columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS recommended_orgs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '';

-- 2. Org display settings (all default false — no fields shown until enabled)
CREATE TABLE IF NOT EXISTS org_display_settings (
  org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  show_goal boolean DEFAULT false,
  show_donors boolean DEFAULT false,
  show_raised boolean DEFAULT false,
  show_recommendations boolean DEFAULT false,
  show_impact_stats boolean DEFAULT false,
  show_related_orgs boolean DEFAULT false
);

-- 3. User location fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text DEFAULT '',
  ADD COLUMN IF NOT EXISTS zip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- 4. Recurring donations
CREATE TABLE IF NOT EXISTS recurring_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  org_id text NOT NULL,
  org_name text NOT NULL,
  amount_cents integer NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  next_charge_at timestamptz
);

-- 5. Site settings (homepage/global editable content)
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_organizations_sort ON organizations (sort_order ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_organizations_visible ON organizations (visible);
CREATE INDEX IF NOT EXISTS idx_recurring_donations_user ON recurring_donations (user_id, active);

-- 7. RLS policies for new tables
ALTER TABLE org_display_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read org_display_settings" ON org_display_settings;
CREATE POLICY "Public read org_display_settings"
  ON org_display_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write org_display_settings" ON org_display_settings;
CREATE POLICY "Admin write org_display_settings"
  ON org_display_settings FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE recurring_donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recurring_donations" ON recurring_donations;
CREATE POLICY "Users manage own recurring_donations"
  ON recurring_donations FOR ALL USING (auth.uid() = user_id);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read site_settings" ON site_settings;
CREATE POLICY "Public read site_settings"
  ON site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth write site_settings" ON site_settings;
CREATE POLICY "Auth write site_settings"
  ON site_settings FOR ALL USING (auth.role() = 'authenticated');
