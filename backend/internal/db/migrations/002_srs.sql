CREATE TABLE IF NOT EXISTS srs_cards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id        VARCHAR(128) NOT NULL,
    term             VARCHAR(255) NOT NULL,
    ease             REAL NOT NULL DEFAULT 2.5,
    interval_days    REAL NOT NULL DEFAULT 0,
    repetitions      INT NOT NULL DEFAULT 0,
    due_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id, term)
);

CREATE INDEX IF NOT EXISTS idx_srs_cards_user_due ON srs_cards(user_id, due_at);
