-- Where a learner left a unit half done, so they resume at that step instead of starting over.
-- step is the index within the lesson; results holds the exercises already graded in it
-- ({"<step>": {"correct": n, "total": n}}) so the lesson score still counts them.
CREATE TABLE IF NOT EXISTS user_unit_position (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id    VARCHAR(128) NOT NULL,
    lesson_id  VARCHAR(128) NOT NULL,
    step       INT NOT NULL CHECK (step >= 0),
    results    JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, unit_id)
);
