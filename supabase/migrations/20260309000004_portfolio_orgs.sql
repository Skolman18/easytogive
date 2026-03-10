-- Portfolio orgs table: stores which orgs each user has in their giving portfolio
CREATE TABLE IF NOT EXISTS portfolio_orgs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  allocation integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, org_id)
);

-- Enable RLS
ALTER TABLE portfolio_orgs ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own portfolio
CREATE POLICY "Users can manage their own portfolio" ON portfolio_orgs
  FOR ALL USING (auth.uid() = user_id);
