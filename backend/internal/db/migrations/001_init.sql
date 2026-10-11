CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id    VARCHAR(128) NOT NULL,
    lesson_id  VARCHAR(128) NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'not_started'
               CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score      INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
