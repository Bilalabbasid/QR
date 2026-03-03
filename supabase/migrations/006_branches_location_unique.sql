-- ============================================================
-- Migration 006: Add unique constraint on branches.google_location_id
-- Without this, the upsert onConflict:'google_location_id' in
-- syncBranches was silently failing (no unique index to conflict on).
-- ============================================================

-- This is the critical fix: allows upsert by google_location_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_google_location_id_unique
    ON branches(google_location_id)
    WHERE google_location_id IS NOT NULL;
