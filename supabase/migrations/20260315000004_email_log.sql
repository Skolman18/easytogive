-- Email log: tracks all inbound emails processed by the AI agent
CREATE TABLE IF NOT EXISTS email_log (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at   timestamptz DEFAULT now(),
  from_email    text,
  subject       text,
  body_preview  text,
  category      text,
  priority      text,
  summary       text,
  requires_response boolean DEFAULT false,
  draft_reply   text,
  action_items  jsonb DEFAULT '[]'::jsonb,
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Service role bypass — API routes use the service role key
CREATE POLICY "service_role_email_log" ON email_log
  USING (true) WITH CHECK (true);

-- Index for the admin inbox view (newest first, by category)
CREATE INDEX idx_email_log_received_at ON email_log (received_at DESC);
CREATE INDEX idx_email_log_category    ON email_log (category);
CREATE INDEX idx_email_log_priority    ON email_log (priority);
