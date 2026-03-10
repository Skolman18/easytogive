-- Giving goals
CREATE TABLE IF NOT EXISTS giving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  goal_amount integer not null,
  period_type text not null,
  start_date date not null,
  end_date date not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Org impact updates
CREATE TABLE IF NOT EXISTS org_impact_updates (
  id uuid primary key default gen_random_uuid(),
  org_id text references organizations(id) on delete cascade,
  posted_by uuid references auth.users(id),
  stat_label text not null,
  stat_value text not null,
  stat_period text not null,
  message text not null,
  visible boolean default true,
  created_at timestamptz default now()
);

-- Audit log for security
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  table_name text,
  record_id text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Rate limiting tracker
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  action text not null,
  count integer default 1,
  window_start timestamptz default now(),
  unique(identifier, action)
);

-- Enable RLS
ALTER TABLE giving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_impact_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Giving goals: users only see and manage their own
DO $$ BEGIN
  CREATE POLICY "Users manage own goals" ON giving_goals FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Impact updates: public read, authenticated write
DO $$ BEGIN
  CREATE POLICY "Impact updates publicly readable" ON org_impact_updates FOR SELECT USING (visible = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can post updates" ON org_impact_updates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Posters can update own updates" ON org_impact_updates FOR UPDATE USING (auth.uid() = posted_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit log: only admin can read, system writes
DO $$ BEGIN
  CREATE POLICY "Only admin can read audit log" ON audit_log FOR SELECT USING (
    auth.jwt() ->> 'email' = 'sethmitzel@gmail.com'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
