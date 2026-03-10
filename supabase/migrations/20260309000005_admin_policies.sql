-- Admin read-all policies for sethmitzel@gmail.com

-- Enable RLS on waitlist if not already
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow waitlist inserts from anyone (needed for coming-soon signup)
DO $$ BEGIN
  CREATE POLICY "Anyone can join waitlist" ON waitlist FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can read all users
DO $$ BEGIN
  CREATE POLICY "Admin read all users" ON users FOR SELECT USING (auth.email() = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can read all portfolio_orgs
DO $$ BEGIN
  CREATE POLICY "Admin read all portfolio_orgs" ON portfolio_orgs FOR SELECT USING (auth.email() = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can read all waitlist entries
DO $$ BEGIN
  CREATE POLICY "Admin read all waitlist" ON waitlist FOR SELECT USING (auth.email() = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can update organizations (visible, featured, verified toggles)
DO $$ BEGIN
  CREATE POLICY "Admin update organizations" ON organizations FOR UPDATE USING (auth.email() = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can delete organizations
DO $$ BEGIN
  CREATE POLICY "Admin delete organizations" ON organizations FOR DELETE USING (auth.email() = 'sethmitzel@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
