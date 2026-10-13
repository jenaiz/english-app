-- Last time the user made an authenticated request (updated at most every few minutes),
-- shown in the admin panel to see who keeps coming back. NULL until their next visit.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);
