-- Name shown in the app and used to address the user. NULL until they set one
-- (or Google provides it); the frontend falls back to the email.
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(50);
