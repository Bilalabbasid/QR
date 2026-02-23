-- ============================================================
-- Phase 8: Performance Optimization Indexes
-- ============================================================

-- Composite index for fast tenant-scoped, paginated review fetches
-- Dramatically speeds up: SELECT * FROM reviews WHERE branch_id = X ORDER BY review_time DESC
CREATE INDEX IF NOT EXISTS idx_reviews_branch_time_composite 
ON reviews (branch_id, review_time DESC);

-- Index for sentiment distribution counts
-- Speeds up: SELECT sentiment, count(*) FROM reviews ... GROUP BY sentiment
CREATE INDEX IF NOT EXISTS idx_reviews_branch_sentiment 
ON reviews (branch_id, sentiment);

-- ANALYZE the tables to update statistics
ANALYZE reviews;
ANALYZE branches;
ANALYZE businesses;
