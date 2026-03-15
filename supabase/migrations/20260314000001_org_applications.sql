-- Org applications submitted via /signup/organization
CREATE TABLE IF NOT EXISTS org_applications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name      text        NOT NULL,
  contact_name  text        NOT NULL DEFAULT '',
  email         text        NOT NULL,
  website       text        NOT NULL DEFAULT '',
  ein           text        NOT NULL DEFAULT '',
  category      text        NOT NULL DEFAULT '',
  subcategory   text        NOT NULL DEFAULT '',
  description   text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
  admin_notes   text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS org_applications_status_idx ON org_applications(status);
CREATE INDEX IF NOT EXISTS org_applications_created_idx ON org_applications(created_at DESC);

ALTER TABLE org_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated users) can insert an application
CREATE POLICY "Public can submit org applications"
  ON org_applications FOR INSERT
  WITH CHECK (true);

-- Only service role can read/update (admin panel uses service role via API)
