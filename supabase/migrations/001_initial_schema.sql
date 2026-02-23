-- ============================================================
-- Google Review Management SaaS - Supabase SQL Migration
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- ENUMS
-- =====================

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE reply_status AS ENUM ('none', 'auto_replied', 'manual_replied');
CREATE TYPE sentiment_type AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE reply_source AS ENUM ('auto', 'manual');
CREATE TYPE alert_type AS ENUM ('low_rating');
CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp');
CREATE TYPE summary_type AS ENUM ('monthly', 'weekly');
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');

-- =====================
-- BUSINESSES
-- =====================

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  subscription_plan subscription_plan DEFAULT 'free',
  google_account_id TEXT,
  auto_reply_enabled BOOLEAN DEFAULT false,
  low_rating_threshold INT DEFAULT 2,
  notification_email TEXT,
  notification_whatsapp TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- USERS (extends auth.users)
-- =====================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'staff',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BRANCHES
-- =====================

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  google_location_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branches_business_id ON branches(business_id);

-- =====================
-- GOOGLE TOKENS
-- =====================

CREATE TABLE google_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- =====================
-- REVIEWS
-- =====================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  google_review_id TEXT UNIQUE NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_profile_photo TEXT,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  review_time TIMESTAMPTZ NOT NULL,
  reply_status reply_status DEFAULT 'none',
  sentiment sentiment_type,
  ai_suggested_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_branch_id ON reviews(branch_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_review_time ON reviews(review_time DESC);
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX idx_reviews_reply_status ON reviews(reply_status);

-- =====================
-- REPLIES
-- =====================

CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  reply_source reply_source DEFAULT 'manual',
  posted_to_google BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id)
);

CREATE INDEX idx_replies_review_id ON replies(review_id);

-- =====================
-- REVIEW TAGS
-- =====================

CREATE TABLE review_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_tags_review_id ON review_tags(review_id);
CREATE INDEX idx_review_tags_tag ON review_tags(tag);

-- =====================
-- ALERTS
-- =====================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  sent_via notification_channel,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_business_id ON alerts(business_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);

-- =====================
-- AI SUMMARIES
-- =====================

CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  summary_type summary_type NOT NULL,
  summary_text TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_summaries_branch_id ON ai_summaries(branch_id);

-- =====================
-- TEAM INVITATIONS
-- =====================

CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role DEFAULT 'staff',
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- SYNC LOGS
-- =====================

CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  status TEXT NOT NULL,
  reviews_fetched INT DEFAULT 0,
  reviews_inserted INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_tokens_updated_at
  BEFORE UPDATE ON google_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- AUTO-CREATE USER ON SIGNUP
-- =====================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'owner'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- RLS: ENABLE
-- =====================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS: HELPER FUNCTION
-- =====================

CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================
-- RLS: BUSINESSES
-- =====================

CREATE POLICY "Users can view their own business"
  ON businesses FOR SELECT
  USING (id = get_user_business_id());

CREATE POLICY "Owners can update their business"
  ON businesses FOR UPDATE
  USING (id = get_user_business_id() AND get_user_role() = 'owner');

CREATE POLICY "Allow insert on businesses"
  ON businesses FOR INSERT
  WITH CHECK (true);

-- =====================
-- RLS: USERS
-- =====================

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid() OR business_id = get_user_business_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Allow insert users"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Owners and managers can delete team members"
  ON users FOR DELETE
  USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'manager')
    AND id != auth.uid()
  );

-- =====================
-- RLS: BRANCHES
-- =====================

CREATE POLICY "Users can view branches in their business"
  ON branches FOR SELECT
  USING (business_id = get_user_business_id());

CREATE POLICY "Owners and managers can insert branches"
  ON branches FOR INSERT
  WITH CHECK (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Owners and managers can update branches"
  ON branches FOR UPDATE
  USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Owners can delete branches"
  ON branches FOR DELETE
  USING (
    business_id = get_user_business_id()
    AND get_user_role() = 'owner'
  );

-- =====================
-- RLS: GOOGLE_TOKENS
-- =====================

CREATE POLICY "Owners can view Google tokens"
  ON google_tokens FOR SELECT
  USING (business_id = get_user_business_id() AND get_user_role() = 'owner');

CREATE POLICY "Owners can manage Google tokens"
  ON google_tokens FOR ALL
  USING (business_id = get_user_business_id() AND get_user_role() = 'owner');

-- =====================
-- RLS: REVIEWS
-- =====================

CREATE POLICY "Users can view reviews in their business"
  ON reviews FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Service role can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners and managers can update reviews"
  ON reviews FOR UPDATE
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE business_id = get_user_business_id()
    )
    AND get_user_role() IN ('owner', 'manager')
  );

-- =====================
-- RLS: REPLIES
-- =====================

CREATE POLICY "Users can view replies in their business"
  ON replies FOR SELECT
  USING (
    review_id IN (
      SELECT r.id FROM reviews r
      JOIN branches b ON r.branch_id = b.id
      WHERE b.business_id = get_user_business_id()
    )
  );

CREATE POLICY "Users can insert replies"
  ON replies FOR INSERT
  WITH CHECK (
    review_id IN (
      SELECT r.id FROM reviews r
      JOIN branches b ON r.branch_id = b.id
      WHERE b.business_id = get_user_business_id()
    )
  );

CREATE POLICY "Users can update replies"
  ON replies FOR UPDATE
  USING (
    review_id IN (
      SELECT r.id FROM reviews r
      JOIN branches b ON r.branch_id = b.id
      WHERE b.business_id = get_user_business_id()
    )
  );

-- =====================
-- RLS: REVIEW TAGS
-- =====================

CREATE POLICY "Users can view review tags in their business"
  ON review_tags FOR SELECT
  USING (
    review_id IN (
      SELECT r.id FROM reviews r
      JOIN branches b ON r.branch_id = b.id
      WHERE b.business_id = get_user_business_id()
    )
  );

CREATE POLICY "Service and authorized users can manage review tags"
  ON review_tags FOR ALL
  USING (
    review_id IN (
      SELECT r.id FROM reviews r
      JOIN branches b ON r.branch_id = b.id
      WHERE b.business_id = get_user_business_id()
    )
  );

-- =====================
-- RLS: ALERTS
-- =====================

CREATE POLICY "Users can view alerts for their business"
  ON alerts FOR SELECT
  USING (business_id = get_user_business_id());

CREATE POLICY "Service can insert alerts"
  ON alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update alerts (mark as read)"
  ON alerts FOR UPDATE
  USING (business_id = get_user_business_id());

-- =====================
-- RLS: AI SUMMARIES
-- =====================

CREATE POLICY "Users can view AI summaries for their branches"
  ON ai_summaries FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE business_id = get_user_business_id()
    )
  );

CREATE POLICY "Service can manage AI summaries"
  ON ai_summaries FOR ALL
  WITH CHECK (true);

-- =====================
-- RLS: TEAM INVITATIONS
-- =====================

CREATE POLICY "Owners and managers can view invitations"
  ON team_invitations FOR SELECT
  USING (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Owners and managers can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    business_id = get_user_business_id()
    AND get_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Public can view invitation by token"
  ON team_invitations FOR SELECT
  USING (true);

-- =====================
-- RLS: SYNC LOGS
-- =====================

CREATE POLICY "Owners can view sync logs"
  ON sync_logs FOR SELECT
  USING (business_id = get_user_business_id() AND get_user_role() = 'owner');

CREATE POLICY "Service can manage sync logs"
  ON sync_logs FOR ALL
  WITH CHECK (true);

-- =====================
-- USEFUL VIEWS
-- =====================

CREATE OR REPLACE VIEW branch_stats AS
SELECT
  b.id AS branch_id,
  b.name AS branch_name,
  b.business_id,
  COUNT(r.id) AS total_reviews,
  ROUND(AVG(r.rating)::NUMERIC, 2) AS avg_rating,
  COUNT(r.id) FILTER (WHERE r.rating <= 2) AS negative_count,
  COUNT(r.id) FILTER (WHERE r.rating >= 4) AS positive_count,
  ROUND(
    (COUNT(r.id) FILTER (WHERE r.rating <= 2)::NUMERIC / NULLIF(COUNT(r.id), 0)) * 100,
    1
  ) AS negative_percentage,
  MAX(r.review_time) AS last_review_date
FROM branches b
LEFT JOIN reviews r ON r.branch_id = b.id
GROUP BY b.id, b.name, b.business_id;

-- Grant view access
GRANT SELECT ON branch_stats TO authenticated;

-- Apply RLS-equivalent filter via function
CREATE OR REPLACE FUNCTION get_branch_stats_for_user()
RETURNS SETOF branch_stats AS $$
  SELECT * FROM branch_stats
  WHERE business_id = get_user_business_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
