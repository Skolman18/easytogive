-- receipts table: one row per PDF document
-- For portfolio donations: 1 portfolio_summary + N individual rows per payment
CREATE TABLE IF NOT EXISTS receipts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_intent_id text NOT NULL,
  donation_ids      uuid[],          -- donation row IDs covered by this receipt
  org_id            text REFERENCES organizations(id) ON DELETE SET NULL,
  type              text NOT NULL CHECK (type IN ('individual', 'portfolio_summary')),
  amount            integer NOT NULL CHECK (amount > 0), -- cents
  receipt_number    text UNIQUE NOT NULL,
  pdf_url           text,            -- Supabase Storage path: {donor_id}/{receipt_id}.pdf
  pdf_status        text NOT NULL DEFAULT 'pending'
                        CHECK (pdf_status IN ('pending', 'generated', 'failed')),
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipts_donor_id_idx ON receipts(donor_id);
CREATE INDEX IF NOT EXISTS receipts_payment_intent_id_idx ON receipts(payment_intent_id);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Donors can only read their own receipts
-- NULL donor_id (guest donors) never matches auth.uid(), so guests get no API access
CREATE POLICY "Donors read own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = donor_id);

-- No service_role RLS policy needed — service role bypasses RLS entirely in Supabase
