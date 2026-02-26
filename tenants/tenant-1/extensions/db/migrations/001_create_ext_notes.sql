-- Extension migration: create ext_notes table
-- This migration is part of the ui-extension for tenant-1.
--
-- Rules enforced by ExtensionMigrationRunner:
--   ✓ Table name starts with "ext_"
--   ✓ No DROP, TRUNCATE, ALTER on core tables
--   ✓ No references to core tables

CREATE TABLE IF NOT EXISTS ext_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_notes_tenant_id ON ext_notes (tenant_id);
