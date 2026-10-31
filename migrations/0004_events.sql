CREATE TABLE events (
 id TEXT PRIMARY KEY NOT NULL, cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id), name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100), description TEXT NOT NULL CHECK(length(description)<=500), occurs_on TEXT NOT NULL CHECK(length(occurs_on)=10),
 version INTEGER NOT NULL CHECK(version>0), created_at TEXT NOT NULL, created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL, last_operation TEXT NOT NULL, fingerprint TEXT NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json))
);
CREATE INDEX events_date ON events(occurs_on DESC,id DESC);
CREATE INDEX events_box ON events(cash_box_id);
CREATE TRIGGER events_active_box BEFORE INSERT ON events WHEN NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL) BEGIN SELECT RAISE(ABORT,'EVENT_BOX_UNAVAILABLE'); END;
CREATE TRIGGER events_box_locked BEFORE UPDATE OF cash_box_id ON events WHEN NEW.cash_box_id!=OLD.cash_box_id BEGIN SELECT RAISE(ABORT,'EVENT_BOX_LOCKED'); END;
CREATE TRIGGER cash_boxes_preserve_events BEFORE UPDATE OF deleted_at ON cash_boxes WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM events WHERE cash_box_id=NEW.id) BEGIN SELECT RAISE(ABORT,'CASH_BOX_HAS_EVENTS'); END;
