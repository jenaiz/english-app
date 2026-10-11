-- Cards can now come from Expresiones (idioms, phrasal verbs) as well as lesson vocabulary.
-- For those, lesson_id is empty and term holds the expression id.
ALTER TABLE srs_cards ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'vocab';
ALTER TABLE srs_cards DROP CONSTRAINT IF EXISTS srs_cards_user_id_lesson_id_term_key;
CREATE UNIQUE INDEX IF NOT EXISTS srs_cards_user_kind_lesson_term ON srs_cards(user_id, kind, lesson_id, term);
