-- Store Stripe customer ID on users for subscription management
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_idx ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Add subscription_id to recurring_donations for management
ALTER TABLE recurring_donations ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE recurring_donations ADD COLUMN IF NOT EXISTS stripe_customer_id text;
CREATE INDEX IF NOT EXISTS recurring_donations_sub_idx ON recurring_donations(stripe_subscription_id);
