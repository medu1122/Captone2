-- Migration 004: site_deployments table (Sprint 3)
-- Run once; safe to re-run (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS site_deployments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  container_id     TEXT,
  container_name   TEXT,
  subdomain        TEXT UNIQUE,
  status           TEXT NOT NULL DEFAULT 'draft',
  port             INTEGER,
  deployed_at      TIMESTAMPTZ,
  last_build_at    TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_deployments_shop_id ON site_deployments (shop_id);
CREATE INDEX IF NOT EXISTS idx_site_deployments_status  ON site_deployments (status);
