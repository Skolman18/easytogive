-- Add "Our Story" field for organizations (nullable)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS our_story text;

