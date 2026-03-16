-- AI Features: portfolio analysis cache + impact summary fields

-- Cache AI portfolio analysis on the user profile
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS portfolio_analysis       jsonb,
  ADD COLUMN IF NOT EXISTS portfolio_analyzed_at    timestamptz;

-- Store AI-generated summaries on impact updates (populated when admin approves)
ALTER TABLE org_impact_updates
  ADD COLUMN IF NOT EXISTS ai_summary        text,
  ADD COLUMN IF NOT EXISTS ai_stat_highlight text;
