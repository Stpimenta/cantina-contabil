CREATE TABLE event_orders (
 id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL REFERENCES events(id), customer_name TEXT NOT NULL CHECK(length(customer_name) BETWEEN 1 AND 100), note TEXT NOT NULL CHECK(length(note)<=500), total_cents INTEGER NOT NULL CHECK(typeof(total_cents)='integer' AND total_cents BETWEEN 0 AND 9007199254740991), paid INTEGER NOT NULL CHECK(paid IN(0,1)), catalog_version INTEGER NOT NULL,
 version INTEGER NOT NULL CHECK(version>0), created_at TEXT NOT NULL, created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL, last_operation TEXT NOT NULL, fingerprint TEXT NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 CHECK(json_type(payload_json,'$.cashCents')='integer' AND json_type(payload_json,'$.pixCents')='integer'),
 CHECK(json_extract(payload_json,'$.cashCents') BETWEEN 0 AND 9007199254740991 AND json_extract(payload_json,'$.pixCents') BETWEEN 0 AND 9007199254740991),
 CHECK(json_extract(payload_json,'$.cashCents')+json_extract(payload_json,'$.pixCents')=CASE WHEN paid=1 THEN total_cents ELSE 0 END),
 CHECK(json_array_length(payload_json,'$.items') BETWEEN 1 AND 100)
);
CREATE INDEX event_orders_event ON event_orders(event_id,created_at DESC,id DESC);
CREATE TRIGGER event_orders_catalog_create BEFORE INSERT ON event_orders WHEN NOT EXISTS(SELECT 1 FROM events e JOIN cash_boxes b ON b.id=e.cash_box_id WHERE e.id=NEW.event_id AND e.version=NEW.catalog_version AND b.deleted_at IS NULL) BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;
CREATE TRIGGER event_orders_catalog_update BEFORE UPDATE ON event_orders WHEN NEW.event_id!=OLD.event_id OR NOT EXISTS(SELECT 1 FROM events e JOIN cash_boxes b ON b.id=e.cash_box_id WHERE e.id=NEW.event_id AND e.version=NEW.catalog_version AND b.deleted_at IS NULL) BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;
CREATE TRIGGER event_orders_precision_insert BEFORE INSERT ON event_orders
 WHEN NEW.total_cents > 9007199254740991 - (
 coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND o.id!=NEW.id AND o.paid=NEW.paid),0)
 + CASE WHEN NEW.paid=1 THEN coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0) ELSE 0 END)
 BEGIN SELECT RAISE(ABORT,'EVENT_AMOUNT_LIMIT'); END;
CREATE TRIGGER event_orders_precision_update BEFORE UPDATE ON event_orders
 WHEN NEW.total_cents > 9007199254740991 - (
 coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND o.id!=NEW.id AND o.paid=NEW.paid),0)
 + CASE WHEN NEW.paid=1 THEN coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0) ELSE 0 END)
 BEGIN SELECT RAISE(ABORT,'EVENT_AMOUNT_LIMIT'); END;
CREATE TRIGGER donations_event_precision BEFORE INSERT ON donations
 WHEN NEW.amount_cents > 9007199254740991 - (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)+coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1),0))
 BEGIN SELECT RAISE(ABORT,'DONATION_BALANCE_LIMIT'); END;
