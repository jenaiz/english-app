-- Club activities unlocked by each learner. milestone is what unlocked it ("unit:<id>" or
-- "checkpoint:<lesson_id>"), so a milestone never unlocks twice; seen_at is null while the
-- activity is still a surprise, best_score keeps the best result (0-100).
CREATE TABLE IF NOT EXISTS user_activity (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id  VARCHAR(128) NOT NULL,
    milestone    VARCHAR(160) NOT NULL,
    unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen_at      TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    best_score   INT CHECK (best_score BETWEEN 0 AND 100),
    PRIMARY KEY (user_id, activity_id)
);
