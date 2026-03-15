-- Add verification workflow columns to org_impact_updates

ALTER TABLE org_impact_updates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS proof_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS proof_note text DEFAULT '',
  ADD COLUMN IF NOT EXISTS rejection_note text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Backfill: existing visible updates are already approved
UPDATE org_impact_updates SET status = 'approved' WHERE visible = true AND status = 'pending';
UPDATE org_impact_updates SET status = 'rejected' WHERE visible = false AND status = 'pending';

-- Drop old "visible = true" public read policy, replace with status-based
DO $$ BEGIN
  DROP POLICY IF EXISTS "Impact updates publicly readable" ON org_impact_updates;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Approved updates publicly readable" ON org_impact_updates
    FOR SELECT USING (status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Org reps can see ALL updates for their own org (to track pending/rejected)
DO $$ BEGIN
  CREATE POLICY "Org reps read own updates" ON org_impact_updates
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = org_id
          AND (o.contact_email = auth.email() OR o.owner_user_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Org reps can insert (pending only)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can post updates" ON org_impact_updates;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Org reps can submit updates" ON org_impact_updates
    FOR INSERT WITH CHECK (
      status = 'pending'
      AND EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = org_id
          AND (o.contact_email = auth.email() OR o.owner_user_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can read all updates
DO $$ BEGIN
  CREATE POLICY "Admin read all impact updates" ON org_impact_updates
    FOR SELECT USING (auth.email() = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can update (approve/reject)
DO $$ BEGIN
  CREATE POLICY "Admin update impact updates" ON org_impact_updates
    FOR UPDATE USING (auth.email() = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for fast status lookups
CREATE INDEX IF NOT EXISTS idx_impact_updates_status ON org_impact_updates(status);
CREATE INDEX IF NOT EXISTS idx_impact_updates_org_status ON org_impact_updates(org_id, status);
