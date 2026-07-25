-- Cross-instance rate limiting for the public /api/cv/* routes (interim
-- protection until Azure AD auth lands). Fixed-window counters keyed by
-- "<identifier>:<group>"; the window resets when expires_at passes.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT        PRIMARY KEY,
  count      INT         NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Supports the opportunistic cleanup of expired rows.
CREATE INDEX IF NOT EXISTS rate_limits_expires_at_idx ON rate_limits (expires_at);
