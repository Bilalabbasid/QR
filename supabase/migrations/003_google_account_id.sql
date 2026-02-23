-- Add google_account_id to google_tokens
-- Stores the GBP account name (e.g. "accounts/123456789") returned by accounts.list
ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS google_account_id TEXT;
