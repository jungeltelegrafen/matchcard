CREATE TABLE IF NOT EXISTS shared_cvs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_data    JSONB       NOT NULL,
  lang       TEXT        NOT NULL DEFAULT 'en',
  filename   TEXT        NOT NULL DEFAULT 'cv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
