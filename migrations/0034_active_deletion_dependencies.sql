-- Only active dependencies prevent logical deletion. Audit rows and snapshots remain untouched.

DROP TRIGGER cash_boxes_preserve_donations;

CREATE TRIGGER cash_boxes_preserve_donations BEFORE UPDATE OF deleted_at ON cash_boxes
WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM donations WHERE cash_box_id = NEW.id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'CASH_BOX_HAS_DONATIONS'); END;

DROP TRIGGER cash_boxes_preserve_events;

CREATE TRIGGER cash_boxes_preserve_events BEFORE UPDATE OF deleted_at ON cash_boxes WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM events WHERE cash_box_id=NEW.id AND deleted_at IS NULL) BEGIN SELECT RAISE(ABORT,'CASH_BOX_HAS_EVENTS'); END;

DROP TRIGGER cash_boxes_preserve_supplies;

CREATE TRIGGER cash_boxes_preserve_supplies BEFORE UPDATE OF deleted_at ON cash_boxes
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_supplies WHERE cash_box_id=NEW.id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'CASH_BOX_HAS_SUPPLIES'); END;

DROP TRIGGER events_preserve_supplies;

CREATE TRIGGER events_preserve_supplies BEFORE UPDATE OF deleted_at ON events
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_supplies WHERE event_id=NEW.id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'EVENT_HAS_SUPPLIES'); END;

DROP TRIGGER cash_boxes_preserve_movements;

CREATE TRIGGER cash_boxes_preserve_movements BEFORE UPDATE OF deleted_at ON cash_boxes
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM cash_movements WHERE cash_box_id=NEW.id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'CASH_BOX_HAS_MOVEMENTS'); END;

DROP TRIGGER events_delete_without_orders;

CREATE TRIGGER events_delete_without_orders BEFORE UPDATE OF deleted_at ON events
WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_orders WHERE event_id=NEW.id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT,'EVENT_HAS_ORDERS'); END;

DROP TRIGGER recurring_category_preserve_stock;

CREATE TRIGGER recurring_category_preserve_stock BEFORE UPDATE ON events WHEN OLD.kind='product_category' BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM product_stock_entries WHERE event_id=OLD.id AND deleted_at IS NULL)
 THEN RAISE(ABORT,'STOCK_HAS_ENTRIES') END;
 SELECT CASE WHEN EXISTS(
 SELECT 1 FROM json_each(OLD.payload_json,'$.products') p WHERE NOT EXISTS(
 SELECT 1 FROM json_each(NEW.payload_json,'$.products') n WHERE json_extract(n.value,'$.id')=json_extract(p.value,'$.id'))
 AND (EXISTS(SELECT 1 FROM product_stock_entries s WHERE s.event_id=OLD.id AND s.deleted_at IS NULL AND s.product_id=json_extract(p.value,'$.id'))
 OR EXISTS(SELECT 1 FROM event_orders o,json_each(o.payload_json,'$.items') i WHERE o.event_id=OLD.id AND o.deleted_at IS NULL AND json_extract(i.value,'$.id')=json_extract(p.value,'$.id'))))
 THEN RAISE(ABORT,'STOCK_PRODUCT_IN_USE') END;
END;
