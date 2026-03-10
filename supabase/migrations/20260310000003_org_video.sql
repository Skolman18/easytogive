ALTER TABLE organizations ADD COLUMN IF NOT EXISTS video_url text DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS video_type text DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS show_video boolean DEFAULT false;
