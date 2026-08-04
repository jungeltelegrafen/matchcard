-- Phase 3: let a consultant record videos on a shared CV via an invite link.
-- `record_token` (nullable) marks a share as recordable — only a link that
-- carries the matching token may append videos (write-back via PATCH). Plain
-- read-only shares keep record_token = NULL. `updated_at` tracks write-backs.
ALTER TABLE shared_cvs ADD COLUMN IF NOT EXISTS record_token TEXT;
ALTER TABLE shared_cvs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
