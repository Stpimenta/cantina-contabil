ALTER TABLE events ADD COLUMN deleted_at TEXT;
ALTER TABLE events ADD COLUMN deleted_by INTEGER;
ALTER TABLE events ADD COLUMN deleted_by_name TEXT;
CREATE INDEX events_active ON events(deleted_at, occurs_on DESC, id DESC);

CREATE TRIGGER events_delete_without_orders BEFORE UPDATE OF deleted_at ON events
WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_orders WHERE event_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'EVENT_HAS_ORDERS'); END;
CREATE TRIGGER events_preserve_deleted BEFORE UPDATE ON events
WHEN OLD.deleted_at IS NOT NULL
BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;
CREATE TRIGGER event_orders_active_event BEFORE INSERT ON event_orders
WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;

