-- 005: Bảng payments + cột VietQR/polling (idempotent khi đã có bảng cũ từ database_design.md)
-- Chạy: psql $DATABASE_URL -f aimap/backend/db/migrations/005_payments_vietqr.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount_money     INTEGER NOT NULL,
  credits          INTEGER NOT NULL,
  gateway          VARCHAR(80) NOT NULL DEFAULT 'vietqr_polling',
  gateway_txn_id   VARCHAR(255),
  status           VARCHAR(30) NOT NULL DEFAULT 'pending',
  transfer_content TEXT,
  qr_image_url     TEXT,
  callback_data    JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at          TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_content TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS qr_image_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE payments SET transfer_content = 'MIGRATED-' || REPLACE(id::text, '-', '')
WHERE transfer_content IS NULL OR trim(transfer_content) = '';

ALTER TABLE payments ALTER COLUMN transfer_content SET NOT NULL;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'expired'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transfer_content ON payments (transfer_content);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_txn_id ON payments (gateway_txn_id) WHERE gateway_txn_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_pending ON payments (status) WHERE status = 'pending';
