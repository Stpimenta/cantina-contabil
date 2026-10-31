ALTER TABLE event_orders ADD COLUMN deleted_at TEXT;
ALTER TABLE event_orders ADD COLUMN deleted_by INTEGER;
ALTER TABLE event_orders ADD COLUMN deleted_by_name TEXT;
CREATE INDEX event_orders_active ON event_orders(event_id,deleted_at,created_at DESC,id DESC);
CREATE TRIGGER event_orders_preserve_deleted BEFORE UPDATE ON event_orders
WHEN OLD.deleted_at IS NOT NULL
BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;

DROP TRIGGER event_orders_precision_insert;
CREATE TRIGGER event_orders_precision_insert BEFORE INSERT ON event_orders
 WHEN NEW.deleted_at IS NULL AND NEW.total_cents > 9007199254740991 - (
 coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND o.deleted_at IS NULL AND o.id!=NEW.id AND o.paid=NEW.paid),0)
 + CASE WHEN NEW.paid=1 THEN coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0) ELSE 0 END)
 BEGIN SELECT RAISE(ABORT,'EVENT_AMOUNT_LIMIT'); END;
DROP TRIGGER event_orders_precision_update;
CREATE TRIGGER event_orders_precision_update BEFORE UPDATE ON event_orders
 WHEN NEW.deleted_at IS NULL AND NEW.total_cents > 9007199254740991 - (
 coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND o.deleted_at IS NULL AND o.id!=NEW.id AND o.paid=NEW.paid),0)
 + CASE WHEN NEW.paid=1 THEN coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0) ELSE 0 END)
 BEGIN SELECT RAISE(ABORT,'EVENT_AMOUNT_LIMIT'); END;
DROP TRIGGER donations_event_precision;
CREATE TRIGGER donations_event_precision BEFORE INSERT ON donations
 WHEN NEW.amount_cents > 9007199254740991 - (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)+coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.deleted_at IS NULL AND o.paid=1),0))
 BEGIN SELECT RAISE(ABORT,'DONATION_BALANCE_LIMIT'); END;
