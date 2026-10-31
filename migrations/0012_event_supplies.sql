CREATE TABLE event_supplies (
 id TEXT PRIMARY KEY NOT NULL,
 event_id TEXT NOT NULL REFERENCES events(id),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents)='integer' AND amount_cents BETWEEN 0 AND 9007199254740991),
 source TEXT NOT NULL CHECK(source IN('purchase','donation')),
 cash_box_id TEXT REFERENCES cash_boxes(id), cash_box_name TEXT,
 received INTEGER NOT NULL CHECK(received IN(0,1)), receipt_key TEXT, receipt_type TEXT,
 version INTEGER NOT NULL CHECK(version>0), created_at TEXT NOT NULL, created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL,
 updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL, fingerprint TEXT NOT NULL,
 CHECK((source='purchase' AND cash_box_id IS NOT NULL AND cash_box_name IS NOT NULL AND amount_cents>0 AND received=1 AND receipt_key IS NOT NULL) OR (source='donation' AND cash_box_id IS NULL AND cash_box_name IS NULL)),
 CHECK((receipt_key IS NULL AND receipt_type IS NULL) OR (receipt_key IS NOT NULL AND receipt_type IN('image/jpeg','image/png','image/webp')))
);
CREATE INDEX event_supplies_event ON event_supplies(event_id,created_at DESC,id DESC);
CREATE INDEX event_supplies_box ON event_supplies(cash_box_id,source);
CREATE TRIGGER supplies_active_event BEFORE INSERT ON event_supplies
 WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'SUPPLY_EVENT_UNAVAILABLE'); END;
CREATE TRIGGER supplies_active_box BEFORE INSERT ON event_supplies
 WHEN NEW.source='purchase' AND NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'SUPPLY_BOX_UNAVAILABLE'); END;
CREATE TRIGGER supplies_precision BEFORE INSERT ON event_supplies
 WHEN NEW.source='purchase' AND coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE source='purchase' AND cash_box_id=NEW.cash_box_id),0)>9007199254740991-NEW.amount_cents
 BEGIN SELECT RAISE(ABORT,'SUPPLY_AMOUNT_LIMIT'); END;
CREATE TRIGGER supplies_sufficient_balance BEFORE INSERT ON event_supplies
 WHEN NEW.source='purchase' AND NEW.amount_cents >
 (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE source='purchase' AND cash_box_id=NEW.cash_box_id),0))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_INSUFFICIENT_BALANCE'); END;
CREATE TRIGGER supplies_receive_only BEFORE UPDATE ON event_supplies
 WHEN OLD.source!='donation' OR OLD.received!=0 OR NEW.received!=1 OR NEW.version!=OLD.version+1
 OR NEW.id IS NOT OLD.id OR NEW.event_id IS NOT OLD.event_id OR NEW.name IS NOT OLD.name OR NEW.amount_cents IS NOT OLD.amount_cents
 OR NEW.source IS NOT OLD.source OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.cash_box_name IS NOT OLD.cash_box_name
 OR NEW.receipt_key IS NOT OLD.receipt_key OR NEW.receipt_type IS NOT OLD.receipt_type OR NEW.created_at IS NOT OLD.created_at
 OR NEW.created_by IS NOT OLD.created_by OR NEW.created_by_name IS NOT OLD.created_by_name OR NEW.fingerprint IS NOT OLD.fingerprint
 BEGIN SELECT RAISE(ABORT,'SUPPLY_CHANGED'); END;
CREATE TRIGGER cash_boxes_preserve_supplies BEFORE UPDATE OF deleted_at ON cash_boxes
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_supplies WHERE cash_box_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'CASH_BOX_HAS_SUPPLIES'); END;
CREATE TRIGGER events_preserve_supplies BEFORE UPDATE OF deleted_at ON events
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_supplies WHERE event_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'EVENT_HAS_SUPPLIES'); END;
