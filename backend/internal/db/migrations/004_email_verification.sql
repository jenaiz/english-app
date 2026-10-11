-- Email verification and password reset. Accounts that existed before this
-- migration are treated as verified so nobody gets locked out.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL;

-- Single-use tokens sent by email. Only the SHA-256 of the token is stored.
CREATE TABLE IF NOT EXISTS email_tokens (
    token_hash BYTEA PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose    VARCHAR(20) NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id, purpose);
