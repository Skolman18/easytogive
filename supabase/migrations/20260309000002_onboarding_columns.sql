-- Add onboarding and personalization columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS causes text[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lng numeric;
