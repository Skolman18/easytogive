-- Add receipt and fee columns to donations table
ALTER TABLE donations ADD COLUMN IF NOT EXISTS fee_amount numeric DEFAULT 0;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS fee_covered boolean DEFAULT false;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS receipt_url text;
