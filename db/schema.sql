-- BusinessFlowDesk: AI call history (applied automatically on first request when DATABASE_URL is set)
CREATE TABLE IF NOT EXISTS ai_calls (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT        NOT NULL CHECK (kind IN ('generate', 'diagnose')),
  status      INTEGER     NOT NULL,
  mock        BOOLEAN     NOT NULL DEFAULT FALSE,
  model       TEXT,
  role        TEXT,
  language    TEXT,
  prompt      TEXT,
  request     JSONB       NOT NULL,
  response    JSONB,
  error       TEXT,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_calls_created_at_idx ON ai_calls (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_calls_kind_idx ON ai_calls (kind, created_at DESC);

-- Server-side flow storage (team sharing)
CREATE TABLE IF NOT EXISTS flows (
  id         TEXT        PRIMARY KEY,
  title      TEXT        NOT NULL DEFAULT '',
  role       TEXT,
  node_count INTEGER     NOT NULL DEFAULT 0,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flows_updated_at_idx ON flows (updated_at DESC);

-- Shared system / interface catalog (single row per key)
CREATE TABLE IF NOT EXISTS catalog (
  key        TEXT        PRIMARY KEY CHECK (key IN ('systems', 'interfaces')),
  data       JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
