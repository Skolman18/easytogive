-- Atomic helper: increment org raised amount and optionally donor count.
-- Called from the webhook handler to avoid read-modify-write race conditions.
CREATE OR REPLACE FUNCTION increment_org_raised(
  p_org_id   text,
  p_dollars  integer,
  p_donor_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_donations integer;
BEGIN
  -- Atomically add to raised
  UPDATE organizations
  SET raised = COALESCE(raised, 0) + p_dollars
  WHERE id = p_org_id;

  -- If a donor was provided, check if this is their first donation to this org
  IF p_donor_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_existing_donations
    FROM donations
    WHERE org_id = p_org_id
      AND user_id = p_donor_id;

    -- count includes the just-inserted row; if exactly 1 it's the first donation
    IF v_existing_donations <= 1 THEN
      UPDATE organizations
      SET donors = COALESCE(donors, 0) + 1
      WHERE id = p_org_id;
    END IF;
  END IF;
END;
$$;

-- NOTE: A unique constraint on stripe_payment_intent_id cannot be added until any
-- existing duplicate rows are deduplicated. Run migration 20260314000005 after cleanup.
