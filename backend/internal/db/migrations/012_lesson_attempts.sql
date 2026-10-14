-- Every finished lesson, kept as an attempt (user_progress only keeps the best score). steps holds
-- each graded exercise: [{"step": n, "type": "...", "correct": n, "total": n,
-- "items": [{"i": n, "ok": bool, "answer": "..."}]}], so mistakes can be shown and practised.
CREATE TABLE IF NOT EXISTS lesson_attempts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id     VARCHAR(128) NOT NULL,
    lesson_id   VARCHAR(128) NOT NULL,
    score       INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    steps       JSONB NOT NULL DEFAULT '[]',
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_attempts_user ON lesson_attempts(user_id, unit_id, finished_at DESC);
