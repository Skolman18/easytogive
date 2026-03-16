-- Add GiveButter integration columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS givebutter_api_key text DEFAULT '',
  ADD COLUMN IF NOT EXISTS givebutter_connected boolean DEFAULT false;
