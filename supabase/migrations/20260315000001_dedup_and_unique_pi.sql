-- Deduplicate donations: for any stripe_payment_intent_id that appears more than once,
-- keep the earliest row (by donated_at) and delete the rest.
DELETE FROM donations
WHERE id NOT IN (
  SELECT DISTINCT ON (stripe_payment_intent_id) id
  FROM donations
  WHERE stripe_payment_intent_id IS NOT NULL
  ORDER BY stripe_payment_intent_id, donated_at ASC
)
AND stripe_payment_intent_id IS NOT NULL;

-- Now enforce uniqueness to prevent future duplicates from webhook retries
ALTER TABLE donations
  ADD CONSTRAINT donations_stripe_pi_unique UNIQUE (stripe_payment_intent_id);
