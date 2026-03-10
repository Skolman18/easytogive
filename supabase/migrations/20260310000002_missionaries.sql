-- Missionary profiles
CREATE TABLE IF NOT EXISTS missionaries (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  photo_url text default '',
  bio text default '',
  mission_org text default '',
  country text default '',
  region text default '',
  monthly_goal_cents integer default 0,
  monthly_raised_cents integer default 0,
  status text default 'pending',
  visible boolean default true,
  featured boolean default false,
  created_at timestamptz default now()
);

-- Missionary updates (newsletter/feed)
CREATE TABLE IF NOT EXISTS missionary_updates (
  id uuid primary key default gen_random_uuid(),
  missionary_id uuid references missionaries(id) on delete cascade,
  title text not null,
  body text not null,
  photo_url text default '',
  visible boolean default true,
  created_at timestamptz default now()
);

-- Missionary applications
CREATE TABLE IF NOT EXISTS missionary_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  mission_org text default '',
  country text not null,
  region text default '',
  bio text not null,
  photo_url text default '',
  monthly_goal integer default 0,
  status text default 'pending',
  admin_notes text default '',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Missionary donations
CREATE TABLE IF NOT EXISTS missionary_donations (
  id uuid primary key default gen_random_uuid(),
  missionary_id uuid references missionaries(id) on delete cascade,
  user_id uuid references auth.users(id),
  amount_cents integer not null,
  fee_cents integer not null default 0,
  fee_covered_by_donor boolean default false,
  net_to_missionary_cents integer not null,
  type text not null,
  status text default 'pending',
  stripe_payment_intent_id text default '',
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE missionaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE missionary_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE missionary_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE missionary_donations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Approved missionaries are publicly readable" ON missionaries FOR SELECT USING (visible = true AND status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all missionaries" ON missionaries FOR ALL USING (auth.jwt() ->> 'email' = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Missionary updates publicly readable" ON missionary_updates FOR SELECT USING (visible = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Missionaries can manage own updates" ON missionary_updates FOR ALL USING (
    EXISTS (SELECT 1 FROM missionaries m WHERE m.id = missionary_id AND m.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users see own applications" ON missionary_applications FOR SELECT USING (email = (auth.jwt() ->> 'email'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can submit application" ON missionary_applications FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin manages applications" ON missionary_applications FOR ALL USING (auth.jwt() ->> 'email' = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users see own missionary donations" ON missionary_donations FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can donate" ON missionary_donations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin reads all missionary donations" ON missionary_donations FOR SELECT USING (auth.jwt() ->> 'email' = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
