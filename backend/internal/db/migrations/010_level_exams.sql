-- Level exam attempts. form is the variant chosen for each part ({"g1": 0, ...}); answers maps
-- item id → answer and is saved as the learner goes. An attempt is open while submitted_at is
-- null; once graded, score/passed/result hold the outcome (result: sections, topics, review).
CREATE TABLE IF NOT EXISTS exam_attempts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id      VARCHAR(64) NOT NULL,
    level_id     VARCHAR(8) NOT NULL,
    form         JSONB NOT NULL,
    answers      JSONB NOT NULL DEFAULT '{}',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline     TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    score        INT CHECK (score BETWEEN 0 AND 100),
    passed       BOOLEAN,
    result       JSONB
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id, exam_id, started_at DESC);
-- At most one open attempt per exam and learner.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_attempts_open ON exam_attempts(user_id, exam_id) WHERE submitted_at IS NULL;
