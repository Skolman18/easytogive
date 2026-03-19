-- Admin Dashboard Schema Migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dfktfiruzulhpwcafaey/sql/new

-- Add suspended/banned to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT '';

-- Add suspended to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

-- Add status/refund fields to donations (stripe_payment_intent_id may already exist)
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS refund_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fee_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_covered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_name text DEFAULT '';

-- Create admin_logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- RLS: admin_logs only readable by service role (no public policy)
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
