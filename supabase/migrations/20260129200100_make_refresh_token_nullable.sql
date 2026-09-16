-- Make refresh_token nullable in google_calendar_connections table
-- This is needed because Google Identity Services doesn't always return a refresh token
-- (only on first authorization or when using authorization code flow)

ALTER TABLE IF EXISTS google_calendar_connections 
ALTER COLUMN refresh_token DROP NOT NULL;
