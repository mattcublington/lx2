-- 009: Add archived_at column to events for soft delete
-- When an event with submitted scores is "deleted", we set archived_at
-- instead of hard-deleting, preserving player score history.

ALTER TABLE events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Filter archived events from default queries
CREATE INDEX IF NOT EXISTS idx_events_archived_at ON events (archived_at) WHERE archived_at IS NULL;

COMMENT ON COLUMN events.archived_at IS 'Soft-delete timestamp. Non-null = archived/hidden from lists but data preserved.';
