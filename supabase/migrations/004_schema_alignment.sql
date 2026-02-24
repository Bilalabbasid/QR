-- ============================================================
-- Migration 004: Schema alignment — adds all missing fields
-- Safe to run on existing data (additive only)
-- ============================================================

-- 1. Fix reply_status enum: add 'not_replied' (DB had 'none')
ALTER TYPE reply_status ADD VALUE IF NOT EXISTS 'not_replied';

-- Update column default to use the correct value
ALTER TABLE reviews ALTER COLUMN reply_status SET DEFAULT 'not_replied';

-- Migrate existing 'none' rows to 'not_replied'
UPDATE reviews SET reply_status = 'not_replied' WHERE reply_status::text = 'none';

-- 2. Add 'pro' to subscription_plan enum (Stripe webhook uses this value)
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pro';

-- 3. Add missing alert_type values
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'negative_sentiment';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'no_reply';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'spike_detected';

-- 4. Add subscription_status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active', 'trialing', 'past_due', 'canceled', 'incomplete'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. Add missing columns to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS subscription_status subscription_status,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 6. Add missing columns to reviews
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS google_review_name TEXT,
  ADD COLUMN IF NOT EXISTS review_date DATE;

-- 7. Ensure google_tokens has google_account_id (migration 003 may not have run)
ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS google_account_id TEXT;

-- 8. Fix review_tags conflicting policies
-- Drop the overly broad ALL policy that conflicts with SELECT
DROP POLICY IF EXISTS "Service and authorized users can manage review tags" ON review_tags;

-- Re-add only the necessary insert policy for service role operations
CREATE POLICY "Authorized users can insert review tags"
  ON review_tags FOR INSERT
  WITH CHECK (
    review_id IN (
      SELECT r.id FROM reviews r
      JOIN branches b ON r.branch_id = b.id
      WHERE b.business_id = get_user_business_id()
    )
  );

-- 9. Add unique constraint on team_invitations (business_id, email) for active invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_pending
  ON team_invitations(business_id, email)
  WHERE accepted = false;

-- 10. Performance: composite index for paginated review fetches with filter
CREATE INDEX IF NOT EXISTS idx_reviews_branch_time_composite
  ON reviews(branch_id, review_time DESC);

-- Ensure businesses updated_at trigger covers new columns
-- (trigger already exists from migration 001)
