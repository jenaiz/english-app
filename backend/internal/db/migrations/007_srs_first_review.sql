-- When a card was reviewed for the first time. A failed card resets its repetitions to 0, so this is
-- what tells a new card (never shown) from a relearned one, for the daily limit of new expressions.
ALTER TABLE srs_cards ADD COLUMN IF NOT EXISTS first_reviewed_at TIMESTAMPTZ;
UPDATE srs_cards SET first_reviewed_at = last_reviewed_at WHERE first_reviewed_at IS NULL AND last_reviewed_at IS NOT NULL;
