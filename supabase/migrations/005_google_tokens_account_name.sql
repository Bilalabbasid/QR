-- ============================================================
-- Migration 005: Add google_account_name to google_tokens
-- The OAuth callback stores both google_account_id and
-- google_account_name; migration 004 only added the former.
-- ============================================================

ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS google_account_name TEXT;
