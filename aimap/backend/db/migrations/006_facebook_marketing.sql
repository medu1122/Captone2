-- 006: Facebook marketing — mở rộng facebook_page_tokens + cache post/insight + AI cache
-- Chạy: psql $DATABASE_URL -f aimap/backend/db/migrations/006_facebook_marketing.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cột bổ sung cho Page (đồng bộ từ Graph)
ALTER TABLE facebook_page_tokens ADD COLUMN IF NOT EXISTS page_category VARCHAR(255);
ALTER TABLE facebook_page_tokens ADD COLUMN IF NOT EXISTS picture_url TEXT;
ALTER TABLE facebook_page_tokens ADD COLUMN IF NOT EXISTS followers_count INTEGER;
ALTER TABLE facebook_page_tokens ADD COLUMN IF NOT EXISTS tasks_json JSONB DEFAULT '[]'::jsonb;

-- Cache danh sách / snapshot post
CREATE TABLE IF NOT EXISTS facebook_posts_cache (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    page_id             VARCHAR(100) NOT NULL,
    post_id             VARCHAR(120) NOT NULL,
    message_preview     TEXT,
    permalink_url       TEXT,
    created_time        TIMESTAMPTZ,
    reach               BIGINT,
    reactions           INTEGER DEFAULT 0,
    comments            INTEGER DEFAULT 0,
    shares              INTEGER DEFAULT 0,
    created_by_app_id   VARCHAR(100),
    insights_json       JSONB DEFAULT '{}'::jsonb,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_fb_posts_cache_shop_page ON facebook_posts_cache (shop_id, page_id);
CREATE INDEX IF NOT EXISTS idx_fb_posts_cache_synced ON facebook_posts_cache (synced_at);

-- Sparkline: giá trị insight theo ngày (UTC date)
CREATE TABLE IF NOT EXISTS facebook_post_insight_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    post_id         VARCHAR(120) NOT NULL,
    snapshot_date   DATE NOT NULL,
    metric_key      VARCHAR(80) NOT NULL,
    value           NUMERIC,
    UNIQUE (shop_id, post_id, snapshot_date, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_fb_post_insight_post ON facebook_post_insight_snapshots (shop_id, post_id);

-- Cache output AI (tránh gọi lặp Ollama)
CREATE TABLE IF NOT EXISTS marketing_ai_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    page_id         VARCHAR(100),
    post_id         VARCHAR(120),
    kind            VARCHAR(40) NOT NULL,
    input_hash      VARCHAR(64) NOT NULL,
    payload_json    JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_ai_lookup ON marketing_ai_cache (shop_id, kind, input_hash);
CREATE INDEX IF NOT EXISTS idx_marketing_ai_expires ON marketing_ai_cache (expires_at);

COMMENT ON TABLE facebook_posts_cache IS 'Snapshot post Page từ Graph; job/sync cập nhật.';
COMMENT ON TABLE facebook_post_insight_snapshots IS 'Chuỗi insight theo ngày cho sparkline.';
COMMENT ON TABLE marketing_ai_cache IS 'Cache kết quả marketing AI (Ollama/bot VPS).';
