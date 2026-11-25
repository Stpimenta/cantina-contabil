-- Unify physical stock: orders may exceed availability; only completion consumes units.
-- Preserve opening references, entries, transfers, order snapshots and financial history.
-- Existing event physical quantity becomes old free quantity + uncompleted commitments.
INSERT OR IGNORE INTO product_stock_members(event_id,product_id,stock_id)
 SELECT e.id,p.id,e.id||':'||p.id FROM event_products p JOIN events e ON e.id=p.event_id
 WHERE e.kind='event';
DROP TRIGGER product_stock_members_create;
DROP TRIGGER product_stock_members_catalog;
CREATE TRIGGER product_stock_members_create AFTER INSERT ON events BEGIN
 INSERT OR IGNORE INTO product_stock_members(event_id,product_id,stock_id)
 SELECT NEW.id,json_extract(value,'$.id'),NEW.id||':'||json_extract(value,'$.id') FROM json_each(NEW.payload_json,'$.products');
END;
CREATE TRIGGER product_stock_members_catalog AFTER UPDATE ON events BEGIN
 INSERT OR IGNORE INTO product_stock_members(event_id,product_id,stock_id)
 SELECT NEW.id,json_extract(value,'$.id'),NEW.id||':'||json_extract(value,'$.id') FROM json_each(NEW.payload_json,'$.products');
END;

CREATE VIEW product_order_stock_consumption AS
 SELECT o.id AS order_id,o.event_id,json_extract(w.value,'$.productId') AS product_id,
 json_extract(w.value,'$.quantity') AS quantity
 FROM event_orders o JOIN events e ON e.id=o.event_id,json_each(o.payload_json,'$.withdrawals') w
 WHERE o.deleted_at IS NULL AND e.delivery_enabled=0 AND e.canteen_enabled=0
 UNION ALL
 SELECT o.id,o.event_id,json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM event_orders o JOIN events e ON e.id=o.event_id,json_each(o.payload_json,'$.items') i
 WHERE o.deleted_at IS NULL AND
 ((e.canteen_enabled=1 AND coalesce(json_extract(o.payload_json,'$.collected'),0)=1)
 OR (e.delivery_enabled=1 AND coalesce(json_extract(o.payload_json,'$.fulfilled'),0)=1));

DROP VIEW product_stock_balances;
DROP VIEW product_stock_contributions;
CREATE VIEW product_stock_contributions AS
 SELECT event_id,product_id,sum(delta) AS quantity FROM (
 SELECT event_id,product_id,quantity AS delta FROM product_stock_entries WHERE deleted_at IS NULL
 UNION ALL SELECT event_id,product_id,quantity FROM product_stock_transfers
 UNION ALL SELECT event_id,product_id,quantity FROM event_stock_opening_commitments
 UNION ALL SELECT event_id,product_id,-quantity FROM product_order_stock_consumption
 ) GROUP BY event_id,product_id;
CREATE VIEW product_stock_balances AS
 WITH pools AS (
 SELECT m.stock_id,sum(coalesce(c.quantity,0)) quantity FROM product_stock_members m
 LEFT JOIN product_stock_contributions c ON c.event_id=m.event_id AND c.product_id=m.product_id GROUP BY m.stock_id
 )
 SELECT m.event_id,m.product_id,p.quantity,m.stock_id FROM product_stock_members m JOIN pools p ON p.stock_id=m.stock_id
 UNION ALL SELECT c.event_id,c.product_id,c.quantity,c.event_id||':'||c.product_id
 FROM product_stock_contributions c WHERE NOT EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=c.event_id AND m.product_id=c.product_id);

DROP TRIGGER product_stock_link_guard;
CREATE TRIGGER product_stock_link_guard BEFORE INSERT ON product_stock_links BEGIN
 SELECT CASE WHEN (json_type(NEW.context_json)!='array' OR json_array_length(NEW.context_json)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.context_json)))!=json_array_length(NEW.context_json) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.context_json))!=json_array_length(NEW.context_json) OR
 EXISTS(SELECT 1 FROM json_each(NEW.context_json) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM product_stock_members m JOIN events e ON e.id=m.event_id,json_each(e.payload_json,'$.products') p
 WHERE m.event_id=NEW.event_id AND m.product_id=NEW.product_id AND m.stock_id=NEW.source_stock_id
 AND e.deleted_at IS NULL AND (e.kind='product_category' OR NEW.action='unlink') AND json_extract(p.value,'$.id')=m.product_id)
 OR NOT EXISTS(SELECT 1 FROM json_each(NEW.context_json) WHERE json_extract(value,'$.eventId')=NEW.event_id AND json_extract(value,'$.productId')=NEW.product_id)
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN (SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=NEW.product_id)!=NEW.expected_quantity
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN NEW.action='link' AND (NEW.target_stock_id IS NULL OR NEW.source_stock_id=NEW.target_stock_id
 OR NOT EXISTS(SELECT 1 FROM product_stock_members m JOIN events e ON e.id=m.event_id,json_each(e.payload_json,'$.products') p
 WHERE m.event_id=NEW.target_event_id AND m.product_id=NEW.target_product_id AND m.stock_id=NEW.target_stock_id
 AND e.deleted_at IS NULL AND json_extract(p.value,'$.id')=m.product_id
 AND (e.kind='product_category' OR (e.kind='event'
 AND NOT EXISTS(SELECT 1 FROM event_products old WHERE old.event_id=e.id AND old.id=m.product_id AND old.version<e.version)
 AND NOT EXISTS(SELECT 1 FROM product_stock_entries WHERE event_id=e.id AND product_id=m.product_id)
 AND NOT EXISTS(SELECT 1 FROM event_orders o,json_each(o.payload_json,'$.items') i WHERE o.event_id=e.id AND json_extract(i.value,'$.id')=m.product_id))))
 OR NOT EXISTS(SELECT 1 FROM json_each(NEW.context_json) WHERE json_extract(value,'$.eventId')=NEW.target_event_id AND json_extract(value,'$.productId')=NEW.target_product_id)
 OR (SELECT quantity FROM product_stock_balances WHERE event_id=NEW.target_event_id AND product_id=NEW.target_product_id)!=NEW.target_quantity)
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN NEW.action='link' AND NEW.expected_quantity>9007199254740991-NEW.target_quantity THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN NEW.action='unlink' AND abs(NEW.quantity-coalesce((SELECT quantity FROM product_stock_contributions WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0))>9007199254740991 THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN NEW.action='unlink' AND ((SELECT count(*) FROM product_stock_members WHERE stock_id=NEW.source_stock_id)<2
 OR NEW.quantity>NEW.expected_quantity OR EXISTS(SELECT 1 FROM product_stock_members WHERE stock_id=NEW.id))
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
END;

DROP TRIGGER recurring_order_insert_guard;
CREATE TRIGGER recurring_order_insert_guard BEFORE INSERT ON event_orders
WHEN (SELECT kind FROM events WHERE id=NEW.event_id)='product_category' BEGIN
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

DROP TRIGGER recurring_order_update_guard;
CREATE TRIGGER recurring_order_update_guard BEFORE UPDATE ON event_orders
WHEN (SELECT kind FROM events WHERE id=NEW.event_id)='product_category' BEGIN
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

DROP TRIGGER event_order_stock_insert_guard;
DROP TRIGGER event_order_stock_update_guard;

CREATE TRIGGER order_physical_stock_insert_guard BEFORE INSERT ON event_orders BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) WHERE delta>available)
 THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) WHERE delta<0 AND available>9007199254740991+delta)
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) WHERE delta!=0)
 AND NEW.stock_context IS NOT NULL AND (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) d WHERE d.delta!=0
 AND (SELECT count(*) FROM product_stock_members WHERE stock_id=d.stock_id)>1
 AND (NEW.stock_context IS NULL OR NOT EXISTS(SELECT 1 FROM json_each(NEW.stock_context) WHERE json_extract(value,'$.stockId')=d.stock_id)))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND (coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR coalesce(json_extract(NEW.payload_json,'$.collected'),0)!=0 OR EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)) THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
END;

CREATE TRIGGER order_physical_stock_update_guard BEFORE UPDATE ON event_orders BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1)))) UNION ALL SELECT product_id,-quantity FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(OLD.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(OLD.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) WHERE delta>available)
 THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1)))) UNION ALL SELECT product_id,-quantity FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(OLD.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(OLD.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) WHERE delta<0 AND available>9007199254740991+delta)
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1)))) UNION ALL SELECT product_id,-quantity FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(OLD.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(OLD.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) WHERE delta!=0)
 AND NEW.stock_context IS NOT NULL AND (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT coalesce(b.stock_id,NEW.event_id||':'||d.product_id) stock_id,sum(d.quantity) delta,coalesce(max(b.quantity),0) available
 FROM (SELECT * FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(NEW.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(NEW.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=1)))) UNION ALL SELECT product_id,-quantity FROM (SELECT json_extract(w.value,'$.productId') product_id,json_extract(w.value,'$.quantity') quantity
 FROM json_each(OLD.payload_json,'$.withdrawals') w
 WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND delivery_enabled=0 AND canteen_enabled=0)
 UNION ALL SELECT json_extract(i.value,'$.id'),json_extract(i.value,'$.quantity')
 FROM json_each(OLD.payload_json,'$.items') i WHERE EXISTS(SELECT 1 FROM events WHERE id=OLD.event_id AND
 ((canteen_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.collected'),0)=1)
 OR (delivery_enabled=1 AND coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)=1))))) d LEFT JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id
 GROUP BY coalesce(b.stock_id,NEW.event_id||':'||d.product_id)) d WHERE d.delta!=0
 AND (SELECT count(*) FROM product_stock_members WHERE stock_id=d.stock_id)>1
 AND (NEW.stock_context IS NULL OR NOT EXISTS(SELECT 1 FROM json_each(NEW.stock_context) WHERE json_extract(value,'$.stockId')=d.stock_id)))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND (coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)!=0 OR coalesce(json_extract(OLD.payload_json,'$.collected'),0)!=0 OR EXISTS(SELECT 1 FROM json_each(OLD.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0) OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR coalesce(json_extract(NEW.payload_json,'$.collected'),0)!=0 OR EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)) THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
END;

DROP TRIGGER shared_stock_preserve_catalog;
CREATE TRIGGER shared_stock_preserve_catalog BEFORE UPDATE ON events BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM product_stock_entries WHERE event_id=OLD.id AND deleted_at IS NULL)
 THEN RAISE(ABORT,'STOCK_HAS_ENTRIES') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=OLD.id
 AND ((SELECT count(*) FROM product_stock_members WHERE stock_id=m.stock_id)>1
 OR coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=m.event_id AND product_id=m.product_id),0)!=0)
 AND (NEW.deleted_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.products') WHERE json_extract(value,'$.id')=m.product_id)))
 THEN RAISE(ABORT,'STOCK_PRODUCT_IN_USE') END;
END;
