-- Preserve old order snapshots and financial history. This opening reference is
-- already committed stock, not a replenishment or a financial transaction.
CREATE TABLE event_stock_opening_commitments (
 event_id TEXT NOT NULL REFERENCES events(id),
 product_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(event_id,product_id)
);
INSERT INTO event_stock_opening_commitments(event_id,product_id,quantity)
 SELECT o.event_id,json_extract(i.value,'$.id'),sum(json_extract(i.value,'$.quantity'))
 FROM event_orders o JOIN events e ON e.id=o.event_id,json_each(o.payload_json,'$.items') i
 WHERE e.kind='event' AND o.deleted_at IS NULL
 GROUP BY o.event_id,json_extract(i.value,'$.id');
CREATE TRIGGER event_stock_opening_no_insert BEFORE INSERT ON event_stock_opening_commitments
 BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;
CREATE TRIGGER event_stock_opening_no_update BEFORE UPDATE ON event_stock_opening_commitments
 BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;
CREATE TRIGGER event_stock_opening_no_delete BEFORE DELETE ON event_stock_opening_commitments
 BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;

DROP VIEW product_stock_balances;
CREATE VIEW product_stock_balances AS
 SELECT event_id,product_id,sum(delta) AS quantity FROM (
  SELECT event_id,product_id,quantity AS delta FROM product_stock_entries WHERE deleted_at IS NULL
  UNION ALL
  SELECT event_id,product_id,quantity FROM event_stock_opening_commitments
  UNION ALL
  SELECT o.event_id,json_extract(w.value,'$.productId'),-json_extract(w.value,'$.quantity')
   FROM event_orders o JOIN events e ON e.id=o.event_id,json_each(o.payload_json,'$.withdrawals') w
   WHERE e.kind='product_category'
  UNION ALL
  SELECT o.event_id,json_extract(i.value,'$.id'),-json_extract(i.value,'$.quantity')
   FROM event_orders o JOIN events e ON e.id=o.event_id,json_each(o.payload_json,'$.items') i
   WHERE e.kind='event' AND o.deleted_at IS NULL
 ) GROUP BY event_id,product_id;

DROP TRIGGER product_stock_entry_create_guard;
DROP TRIGGER product_stock_entry_update_guard;
CREATE TRIGGER product_stock_entry_create_guard BEFORE INSERT ON product_stock_entries BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL OR NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events e,json_each(e.payload_json,'$.products') p
 WHERE e.id=NEW.event_id AND e.deleted_at IS NULL
 AND json_extract(p.value,'$.id')=NEW.product_id) THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN NEW.version!=1 OR NEW.quantity=0 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN coalesce((SELECT sum(quantity) FROM (SELECT quantity FROM product_stock_entries WHERE event_id=NEW.event_id AND product_id=NEW.product_id AND deleted_at IS NULL UNION ALL SELECT quantity FROM event_stock_opening_commitments WHERE event_id=NEW.event_id AND product_id=NEW.product_id)),0)>9007199254740991-NEW.quantity
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
END;
CREATE TRIGGER product_stock_entry_update_guard BEFORE UPDATE ON product_stock_entries BEGIN
 SELECT CASE WHEN OLD.deleted_at IS NOT NULL OR NEW.id!=OLD.id OR NEW.event_id!=OLD.event_id OR NEW.product_id!=OLD.product_id
 OR NEW.version!=OLD.version+1 OR NEW.created_at!=OLD.created_at OR NEW.created_by!=OLD.created_by OR NEW.created_by_name!=OLD.created_by_name
 OR NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL)
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN (NEW.deleted_at IS NULL AND (NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL))
 OR (NEW.deleted_at IS NOT NULL AND (NEW.deleted_by IS NULL OR NEW.deleted_by_name IS NULL OR NEW.quantity!=OLD.quantity))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0)+(CASE WHEN NEW.deleted_at IS NULL THEN NEW.quantity ELSE 0 END)-OLD.quantity<0
 THEN RAISE(ABORT,'STOCK_ENTRY_REDUCTION_BLOCKED') END;
 SELECT CASE WHEN coalesce((SELECT sum(quantity) FROM (SELECT quantity FROM product_stock_entries WHERE event_id=NEW.event_id AND product_id=NEW.product_id AND id!=NEW.id AND deleted_at IS NULL UNION ALL SELECT quantity FROM event_stock_opening_commitments WHERE event_id=NEW.event_id AND product_id=NEW.product_id)),0)>9007199254740991-(CASE WHEN NEW.deleted_at IS NULL THEN NEW.quantity ELSE 0 END)
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
END;

DROP TRIGGER recurring_category_preserve_stock;
CREATE TRIGGER recurring_category_preserve_stock BEFORE UPDATE ON events BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM product_stock_entries WHERE event_id=OLD.id AND deleted_at IS NULL)
 THEN RAISE(ABORT,'STOCK_HAS_ENTRIES') END;
 SELECT CASE WHEN EXISTS(
 SELECT 1 FROM json_each(OLD.payload_json,'$.products') p WHERE NOT EXISTS(
 SELECT 1 FROM json_each(NEW.payload_json,'$.products') n WHERE json_extract(n.value,'$.id')=json_extract(p.value,'$.id'))
 AND (EXISTS(SELECT 1 FROM product_stock_entries s WHERE s.event_id=OLD.id AND s.deleted_at IS NULL AND s.product_id=json_extract(p.value,'$.id'))
 OR EXISTS(SELECT 1 FROM event_orders o,json_each(o.payload_json,'$.items') i WHERE o.event_id=OLD.id AND o.deleted_at IS NULL AND json_extract(i.value,'$.id')=json_extract(p.value,'$.id'))))
 THEN RAISE(ABORT,'STOCK_PRODUCT_IN_USE') END;
END;

CREATE TRIGGER event_order_stock_insert_guard BEFORE INSERT ON event_orders
 WHEN (SELECT kind FROM events WHERE id=NEW.event_id)='event' BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NULL AND EXISTS(
  SELECT 1 FROM json_each(NEW.payload_json,'$.items') i
  WHERE json_extract(i.value,'$.quantity')-0>
   coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=json_extract(i.value,'$.id')),0)
 ) THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND (
  coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR coalesce(json_extract(NEW.payload_json,'$.collected'),0)!=0
  OR EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)
 ) THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
END;

CREATE TRIGGER event_order_stock_update_guard BEFORE UPDATE ON event_orders
 WHEN (SELECT kind FROM events WHERE id=NEW.event_id)='event' BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NULL AND EXISTS(
  SELECT 1 FROM json_each(NEW.payload_json,'$.items') i
  WHERE json_extract(i.value,'$.quantity')-coalesce((SELECT json_extract(p.value,'$.quantity') FROM json_each(OLD.payload_json,'$.items') p WHERE json_extract(p.value,'$.id')=json_extract(i.value,'$.id')),0)>
   coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=json_extract(i.value,'$.id')),0)
 ) THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND (
  coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)!=0 OR coalesce(json_extract(OLD.payload_json,'$.collected'),0)!=0
  OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR coalesce(json_extract(NEW.payload_json,'$.collected'),0)!=0
  OR EXISTS(SELECT 1 FROM json_each(OLD.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)
  OR EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)
 ) THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
END;

CREATE TRIGGER event_order_stock_withdrawal_guard BEFORE UPDATE ON event_orders
 WHEN (SELECT kind FROM events WHERE id=NEW.event_id)='event' AND NEW.deleted_at IS NULL BEGIN
 -- Completed delivery/canteen orders cannot be reduced before undoing completion.
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM json_each(OLD.payload_json,'$.items') i
  WHERE (coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)!=0 OR coalesce(json_extract(OLD.payload_json,'$.collected'),0)!=0)
   AND json_extract(i.value,'$.quantity')>coalesce((SELECT json_extract(n.value,'$.quantity') FROM json_each(NEW.payload_json,'$.items') n WHERE json_extract(n.value,'$.id')=json_extract(i.value,'$.id')),0)
 ) OR EXISTS(
  SELECT 1 FROM json_each(OLD.payload_json,'$.withdrawals') w
  WHERE json_extract(w.value,'$.quantity')>coalesce((SELECT json_extract(n.value,'$.quantity') FROM json_each(NEW.payload_json,'$.items') n WHERE json_extract(n.value,'$.id')=json_extract(w.value,'$.productId')),0)
 ) THEN RAISE(ABORT,'ORDER_BELOW_WITHDRAWN') END;
END;

CREATE TRIGGER standard_event_order_insert_guard BEFORE INSERT ON event_orders
WHEN EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind='event' AND delivery_enabled=0 AND canteen_enabled=0) BEGIN
 SELECT CASE WHEN coalesce(json_type(NEW.payload_json,'$.withdrawals'),'array')!='array'
 OR (SELECT count(*) FROM json_each(NEW.payload_json,'$.withdrawals'))>100
 OR (SELECT count(*) FROM json_each(NEW.payload_json,'$.withdrawals'))!=(SELECT count(DISTINCT json_extract(value,'$.productId')) FROM json_each(NEW.payload_json,'$.withdrawals'))
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') w WHERE
 coalesce(json_type(w.value,'$.quantity'),'null')!='integer' OR json_extract(w.value,'$.quantity') NOT BETWEEN 0 AND 9007199254740991
 OR NOT EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.items') i WHERE json_extract(i.value,'$.id')=json_extract(w.value,'$.productId') AND json_extract(i.value,'$.quantity')>=json_extract(w.value,'$.quantity')))
 THEN RAISE(ABORT,'WITHDRAWAL_ABOVE_ORDERED') END;

 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)
 THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
 SELECT CASE WHEN json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT NULL
 OR json_extract(NEW.payload_json,'$.address') IS NOT NULL OR coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')!=''
 OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR json_type(NEW.payload_json,'$.collected') IS NOT NULL
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
END;

CREATE TRIGGER standard_event_order_update_guard BEFORE UPDATE ON event_orders
WHEN EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind='event' AND delivery_enabled=0 AND canteen_enabled=0) BEGIN
 SELECT CASE WHEN coalesce(json_type(NEW.payload_json,'$.withdrawals'),'array')!='array'
 OR (SELECT count(*) FROM json_each(NEW.payload_json,'$.withdrawals'))>100
 OR (SELECT count(*) FROM json_each(NEW.payload_json,'$.withdrawals'))!=(SELECT count(DISTINCT json_extract(value,'$.productId')) FROM json_each(NEW.payload_json,'$.withdrawals'))
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') w WHERE
 coalesce(json_type(w.value,'$.quantity'),'null')!='integer' OR json_extract(w.value,'$.quantity') NOT BETWEEN 0 AND 9007199254740991
 OR NOT EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.items') i WHERE json_extract(i.value,'$.id')=json_extract(w.value,'$.productId') AND json_extract(i.value,'$.quantity')>=json_extract(w.value,'$.quantity')))
 THEN RAISE(ABORT,'WITHDRAWAL_ABOVE_ORDERED') END;

 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)
 THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
 SELECT CASE WHEN json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT NULL
 OR json_extract(NEW.payload_json,'$.address') IS NOT NULL OR coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')!=''
 OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR json_type(NEW.payload_json,'$.collected') IS NOT NULL
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
END;

-- Undo a standard withdrawal before switching to delivery mode, so completion
-- cannot disappear just by changing which fulfillment field the UI reads.
CREATE TRIGGER events_stock_delivery_switch_guard BEFORE UPDATE OF delivery_enabled ON events
 WHEN OLD.delivery_enabled=0 AND NEW.delivery_enabled=1 AND EXISTS(
  SELECT 1 FROM event_orders o,json_each(o.payload_json,'$.withdrawals') w
   WHERE o.event_id=OLD.id AND o.deleted_at IS NULL AND json_extract(w.value,'$.quantity')>0
 ) BEGIN SELECT RAISE(ABORT,'EVENT_DELIVERY_LOCKED'); END;
