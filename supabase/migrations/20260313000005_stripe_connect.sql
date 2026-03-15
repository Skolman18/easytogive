-- Stripe Connect: org account fields
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- stripe_payment_intent_id on donations (for webhook dedup + receipt linking)
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS donations_stripe_pi_idx ON donations(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS organizations_stripe_account_idx ON organizations(stripe_account_id);
CREATE INDEX IF NOT EXISTS organizations_owner_user_idx ON organizations(owner_user_id);
