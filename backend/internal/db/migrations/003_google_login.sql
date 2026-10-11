-- Google sign-in: accounts created through Google have no password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) UNIQUE;
