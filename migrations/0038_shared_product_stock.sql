-- Recurring products share physical stock only. Prices, orders and cash-box ownership stay unchanged.
CREATE TABLE product_stock_members (
 event_id TEXT NOT NULL REFERENCES events(id), product_id TEXT NOT NULL,
 stock_id TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(event_id,product_id)
);
CREATE INDEX product_stock_members_pool ON product_stock_members(stock_id,event_id,product_id);
INSERT INTO product_stock_members(event_id,product_id,stock_id)
 SELECT e.id,json_extract(p.value,'$.id'),e.id||':'||json_extract(p.value,'$.id')
 FROM events e,json_each(e.payload_json,'$.products') p WHERE e.kind='product_category';
CREATE TRIGGER product_stock_members_create AFTER INSERT ON events WHEN NEW.kind='product_category' BEGIN
 INSERT OR IGNORE INTO product_stock_members(event_id,product_id,stock_id)
 SELECT NEW.id,json_extract(value,'$.id'),NEW.id||':'||json_extract(value,'$.id') FROM json_each(NEW.payload_json,'$.products');
END;
CREATE TRIGGER product_stock_members_catalog AFTER UPDATE ON events WHEN NEW.kind='product_category' BEGIN
 INSERT OR IGNORE INTO product_stock_members(event_id,product_id,stock_id)
 SELECT NEW.id,json_extract(value,'$.id'),NEW.id||':'||json_extract(value,'$.id') FROM json_each(NEW.payload_json,'$.products');
END;
CREATE TABLE product_stock_links (
 id TEXT PRIMARY KEY NOT NULL, action TEXT NOT NULL CHECK(action IN('link','unlink')),
 event_id TEXT NOT NULL REFERENCES events(id), product_id TEXT NOT NULL,
 target_event_id TEXT, target_product_id TEXT, source_stock_id TEXT NOT NULL, target_stock_id TEXT,
 quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity BETWEEN 0 AND 9007199254740991),
 expected_quantity INTEGER NOT NULL, target_quantity INTEGER NOT NULL,
 context_json TEXT NOT NULL CHECK(json_valid(context_json)),
 actor_id INTEGER NOT NULL, actor_name TEXT NOT NULL, occurred_at TEXT NOT NULL,
 fingerprint TEXT NOT NULL, before_json TEXT NOT NULL CHECK(json_valid(before_json)),
 after_json TEXT NOT NULL CHECK(json_valid(after_json))
);
CREATE TABLE product_stock_transfers (
 operation_id TEXT NOT NULL REFERENCES product_stock_links(id),
 event_id TEXT NOT NULL REFERENCES events(id), product_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity BETWEEN -9007199254740991 AND 9007199254740991),
 PRIMARY KEY(operation_id,event_id,product_id)
);
CREATE INDEX product_stock_transfers_product ON product_stock_transfers(event_id,product_id);
-- Keep original contributions and order snapshots; splitting records a balanced physical transfer.
CREATE VIEW product_stock_contributions AS
 SELECT event_id,product_id,sum(delta) AS quantity FROM (
 SELECT event_id,product_id,quantity AS delta FROM product_stock_entries WHERE deleted_at IS NULL
 UNION ALL SELECT event_id,product_id,quantity FROM product_stock_transfers
 UNION ALL SELECT event_id,product_id,quantity FROM event_stock_opening_commitments
 UNION ALL SELECT o.event_id,json_extract(w.value,'$.productId'),-json_extract(w.value,'$.quantity')
 FROM event_orders o JOIN events e ON e.id=o.event_id,json_each(o.payload_json,'$.withdrawals') w WHERE e.kind='product_category'
 UNION ALL SELECT o.event_id,json_extract(i.value,'$.id'),-json_extract(i.value,'$.quantity')
 FROM event_orders o JOIN events e ON e.id=o.event_id,json_each(o.payload_json,'$.items') i WHERE e.kind='event' AND o.deleted_at IS NULL
 ) GROUP BY event_id,product_id;
DROP VIEW product_stock_balances;
CREATE VIEW product_stock_balances AS
 WITH pools AS (
 SELECT m.stock_id,sum(coalesce(c.quantity,0)) quantity FROM product_stock_members m
 LEFT JOIN product_stock_contributions c ON c.event_id=m.event_id AND c.product_id=m.product_id GROUP BY m.stock_id
 )
 SELECT m.event_id,m.product_id,p.quantity,m.stock_id FROM product_stock_members m JOIN pools p ON p.stock_id=m.stock_id
 UNION ALL SELECT c.event_id,c.product_id,c.quantity,c.event_id||':'||c.product_id
 FROM product_stock_contributions c WHERE NOT EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=c.event_id AND m.product_id=c.product_id);
ALTER TABLE product_stock_entries ADD COLUMN stock_context TEXT;
ALTER TABLE event_orders ADD COLUMN stock_context TEXT;

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
 AND e.deleted_at IS NULL AND e.kind='product_category' AND json_extract(p.value,'$.id')=m.product_id)
 OR NOT EXISTS(SELECT 1 FROM json_each(NEW.context_json) WHERE json_extract(value,'$.eventId')=NEW.event_id AND json_extract(value,'$.productId')=NEW.product_id)
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN (SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=NEW.product_id)!=NEW.expected_quantity
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN NEW.action='link' AND (NEW.target_stock_id IS NULL OR NEW.source_stock_id=NEW.target_stock_id
 OR NOT EXISTS(SELECT 1 FROM product_stock_members m JOIN events e ON e.id=m.event_id,json_each(e.payload_json,'$.products') p
 WHERE m.event_id=NEW.target_event_id AND m.product_id=NEW.target_product_id AND m.stock_id=NEW.target_stock_id
 AND e.deleted_at IS NULL AND e.kind='product_category' AND json_extract(p.value,'$.id')=m.product_id)
 OR NOT EXISTS(SELECT 1 FROM json_each(NEW.context_json) WHERE json_extract(value,'$.eventId')=NEW.target_event_id AND json_extract(value,'$.productId')=NEW.target_product_id)
 OR (SELECT quantity FROM product_stock_balances WHERE event_id=NEW.target_event_id AND product_id=NEW.target_product_id)!=NEW.target_quantity)
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN NEW.action='link' AND NEW.expected_quantity>9007199254740991-NEW.target_quantity THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN NEW.action='unlink' AND abs(NEW.quantity-coalesce((SELECT quantity FROM product_stock_contributions WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0))>9007199254740991 THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN NEW.action='unlink' AND ((SELECT count(*) FROM product_stock_members WHERE stock_id=NEW.source_stock_id)<2
 OR NEW.quantity>NEW.expected_quantity OR EXISTS(SELECT 1 FROM product_stock_members WHERE stock_id=NEW.id))
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
END;
CREATE TRIGGER product_stock_link_apply AFTER INSERT ON product_stock_links BEGIN
 INSERT INTO product_stock_transfers(operation_id,event_id,product_id,quantity)
 SELECT NEW.id,NEW.event_id,NEW.product_id,NEW.quantity-coalesce((SELECT quantity FROM product_stock_contributions WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0)
 WHERE NEW.action='unlink';
 INSERT INTO product_stock_transfers(operation_id,event_id,product_id,quantity)
 SELECT NEW.id,m.event_id,m.product_id,-(SELECT quantity FROM product_stock_transfers WHERE operation_id=NEW.id AND event_id=NEW.event_id AND product_id=NEW.product_id)
 FROM product_stock_members m WHERE NEW.action='unlink' AND m.stock_id=NEW.source_stock_id
 AND (m.event_id!=NEW.event_id OR m.product_id!=NEW.product_id) ORDER BY m.event_id,m.product_id LIMIT 1;
 UPDATE product_stock_members SET revision=revision+1,
 stock_id=CASE WHEN NEW.action='link' THEN NEW.source_stock_id
 WHEN event_id=NEW.event_id AND product_id=NEW.product_id THEN NEW.id ELSE stock_id END
 WHERE stock_id=NEW.source_stock_id OR (NEW.action='link' AND stock_id=NEW.target_stock_id);
 SELECT CASE WHEN EXISTS(SELECT 1 FROM product_stock_balances WHERE quantity<0 OR quantity>9007199254740991 OR typeof(quantity)!='integer') THEN RAISE(ABORT,'STOCK_LIMIT') END;
END;
CREATE TRIGGER product_stock_links_no_update BEFORE UPDATE ON product_stock_links BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;
CREATE TRIGGER product_stock_links_no_delete BEFORE DELETE ON product_stock_links BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;
CREATE TRIGGER product_stock_transfers_no_update BEFORE UPDATE ON product_stock_transfers BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;
CREATE TRIGGER product_stock_transfers_no_delete BEFORE DELETE ON product_stock_transfers BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;

DROP TRIGGER product_stock_entry_create_guard;
CREATE TRIGGER product_stock_entry_create_guard BEFORE INSERT ON product_stock_entries BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL OR NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events e,json_each(e.payload_json,'$.products') p
 WHERE e.id=NEW.event_id AND e.deleted_at IS NULL
 AND json_extract(p.value,'$.id')=NEW.product_id) THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN NEW.version!=1 OR NEW.quantity=0 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0)>9007199254740991-(NEW.quantity) THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN NEW.stock_context IS NOT NULL AND (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=NEW.event_id AND m.product_id=NEW.product_id AND (SELECT count(*) FROM product_stock_members WHERE stock_id=m.stock_id)>1)
 AND (NEW.stock_context IS NULL OR NOT EXISTS(SELECT 1 FROM json_each(NEW.stock_context) WHERE json_extract(value,'$.eventId')=NEW.event_id AND json_extract(value,'$.productId')=NEW.product_id))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
END;

DROP TRIGGER product_stock_entry_update_guard;
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
 SELECT CASE WHEN coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0)>9007199254740991-((CASE WHEN NEW.deleted_at IS NULL THEN NEW.quantity ELSE 0 END)-OLD.quantity) THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN NEW.stock_context IS NOT NULL AND (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=NEW.event_id AND m.product_id=NEW.product_id AND (SELECT count(*) FROM product_stock_members WHERE stock_id=m.stock_id)>1)
 AND (NEW.stock_context IS NULL OR NOT EXISTS(SELECT 1 FROM json_each(NEW.stock_context) WHERE json_extract(value,'$.eventId')=NEW.event_id AND json_extract(value,'$.productId')=NEW.product_id))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
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
 SELECT CASE WHEN NEW.stock_context IS NOT NULL AND (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT NULL product_id,0 quantity WHERE 0
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) WHERE delta>available) THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT NULL product_id,0 quantity WHERE 0
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) WHERE delta<0 AND available>9007199254740991+delta) THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT NULL product_id,0 quantity WHERE 0
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) d WHERE d.delta!=0 AND (SELECT count(*) FROM product_stock_members WHERE stock_id=d.stock_id)>1)
 AND (NEW.stock_context IS NULL OR (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) OR EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT NULL product_id,0 quantity WHERE 0
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) d WHERE d.delta!=0 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.stock_context) WHERE json_extract(value,'$.stockId')=d.stock_id)))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
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
 SELECT CASE WHEN NEW.stock_context IS NOT NULL AND (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT json_extract(value,'$.productId') product_id,-json_extract(value,'$.quantity') quantity FROM json_each(OLD.payload_json,'$.withdrawals')
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) WHERE delta>available) THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT json_extract(value,'$.productId') product_id,-json_extract(value,'$.quantity') quantity FROM json_each(OLD.payload_json,'$.withdrawals')
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) WHERE delta<0 AND available>9007199254740991+delta) THEN RAISE(ABORT,'STOCK_LIMIT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT json_extract(value,'$.productId') product_id,-json_extract(value,'$.quantity') quantity FROM json_each(OLD.payload_json,'$.withdrawals')
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) d WHERE d.delta!=0 AND (SELECT count(*) FROM product_stock_members WHERE stock_id=d.stock_id)>1)
 AND (NEW.stock_context IS NULL OR (json_type(NEW.stock_context)!='array' OR json_array_length(NEW.stock_context)=0 OR
 (SELECT count(*) FROM product_stock_members WHERE stock_id IN(SELECT json_extract(value,'$.stockId') FROM json_each(NEW.stock_context)))!=json_array_length(NEW.stock_context) OR
 (SELECT count(DISTINCT json_extract(value,'$.eventId')||':'||json_extract(value,'$.productId')) FROM json_each(NEW.stock_context))!=json_array_length(NEW.stock_context) OR
 EXISTS(SELECT 1 FROM json_each(NEW.stock_context) x LEFT JOIN product_stock_members m
 ON m.event_id=json_extract(x.value,'$.eventId') AND m.product_id=json_extract(x.value,'$.productId')
 LEFT JOIN events e ON e.id=m.event_id WHERE m.stock_id IS NULL OR e.deleted_at IS NOT NULL
 OR m.stock_id IS NOT json_extract(x.value,'$.stockId') OR m.revision IS NOT json_extract(x.value,'$.revision')
 OR e.version IS NOT json_extract(x.value,'$.eventVersion'))) OR EXISTS(SELECT 1 FROM (SELECT stock_id,sum(d.quantity) delta,max(b.quantity) available FROM (
 SELECT json_extract(value,'$.productId') product_id,json_extract(value,'$.quantity') quantity FROM json_each(NEW.payload_json,'$.withdrawals')
 UNION ALL SELECT json_extract(value,'$.productId') product_id,-json_extract(value,'$.quantity') quantity FROM json_each(OLD.payload_json,'$.withdrawals')
 ) d JOIN product_stock_balances b ON b.event_id=NEW.event_id AND b.product_id=d.product_id GROUP BY stock_id) d WHERE d.delta!=0 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.stock_context) WHERE json_extract(value,'$.stockId')=d.stock_id)))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
END;

-- Linked products must be explicitly detached before deleting a product or its category.
CREATE TRIGGER shared_stock_preserve_catalog BEFORE UPDATE ON events WHEN OLD.kind='product_category' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM product_stock_members m WHERE m.event_id=OLD.id
 AND ((SELECT count(*) FROM product_stock_members WHERE stock_id=m.stock_id)>1
 OR coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=m.event_id AND product_id=m.product_id),0)!=0)
 AND (NEW.deleted_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.products') WHERE json_extract(value,'$.id')=m.product_id)))
 THEN RAISE(ABORT,'STOCK_PRODUCT_IN_USE') END;
END;
