-- Grammar practice (Repaso → Gramática). Topics and items are content (data/practice); these
-- tables keep each learner's history with them.

-- Every finished practice round: items holds [{"id": "...", "ok": bool, "answer": "..."}].
CREATE TABLE IF NOT EXISTS practice_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id    VARCHAR(128) NOT NULL,
    correct     INT NOT NULL CHECK (correct >= 0),
    total       INT NOT NULL CHECK (total >= correct),
    items       JSONB NOT NULL DEFAULT '[]',
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions(user_id, topic_id, finished_at DESC);

-- How each item went for a learner, to pick the next round: missed items come back first,
-- then unseen ones, then the ones seen longest ago.
CREATE TABLE IF NOT EXISTS practice_item_stats (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id      VARCHAR(160) NOT NULL,
    seen         INT NOT NULL DEFAULT 0,
    correct      INT NOT NULL DEFAULT 0,
    last_ok      BOOLEAN NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- Spaced repetition per topic (SM-2, like the review cards): when it is due for practice again.
-- A mistake in a lesson or the exam on one of its tags makes it due now.
CREATE TABLE IF NOT EXISTS practice_topics (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id      VARCHAR(128) NOT NULL,
    ease          REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 0,
    repetitions   INT NOT NULL DEFAULT 0,
    due_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);
