-- Extend the existing sales catalog without changing existing records or audit snapshots.
-- Rebuild only events to allow an absent date; no rename of the referenced table.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE recurring_events_copy AS SELECT * FROM events;
DROP TABLE events;
CREATE TABLE events (
 id TEXT PRIMARY KEY NOT NULL,
 cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 description TEXT NOT NULL CHECK(length(description)<=500),
 occurs_on TEXT,
 version INTEGER NOT NULL CHECK(version>0),
 created_at TEXT NOT NULL, created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL,
 updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL,
 last_operation TEXT NOT NULL, fingerprint TEXT NOT NULL,
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 deleted_at TEXT, deleted_by INTEGER, deleted_by_name TEXT,
 delivery_enabled INTEGER NOT NULL DEFAULT 0 CHECK(delivery_enabled IN(0,1)),
 canteen_enabled INTEGER NOT NULL DEFAULT 0 CHECK(canteen_enabled IN(0,1)),
 kind TEXT NOT NULL DEFAULT 'event' CHECK(kind IN('event','product_category')),
 CHECK((kind='event' AND occurs_on IS NOT NULL AND length(occurs_on)=10)
    OR (kind='product_category' AND occurs_on IS NULL AND delivery_enabled=0 AND canteen_enabled=0))
);
INSERT INTO events(id,cash_box_id,name,description,occurs_on,version,created_at,created_by,created_by_name,updated_at,updated_by,updated_by_name,last_operation,fingerprint,payload_json,deleted_at,deleted_by,deleted_by_name,delivery_enabled,canteen_enabled) SELECT id,cash_box_id,name,description,occurs_on,version,created_at,created_by,created_by_name,updated_at,updated_by,updated_by_name,last_operation,fingerprint,payload_json,deleted_at,deleted_by,deleted_by_name,delivery_enabled,canteen_enabled FROM recurring_events_copy;
DROP TABLE recurring_events_copy;
CREATE INDEX events_date ON events(occurs_on DESC,id DESC);
CREATE INDEX events_box ON events(cash_box_id);
CREATE INDEX events_active ON events(deleted_at, occurs_on DESC, id DESC);
CREATE TRIGGER events_active_box BEFORE INSERT ON events WHEN NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL) BEGIN SELECT RAISE(ABORT,'EVENT_BOX_UNAVAILABLE'); END;
CREATE TRIGGER events_box_locked BEFORE UPDATE OF cash_box_id ON events WHEN NEW.cash_box_id!=OLD.cash_box_id BEGIN SELECT RAISE(ABORT,'EVENT_BOX_LOCKED'); END;
CREATE TRIGGER event_products_create AFTER INSERT ON events BEGIN
 INSERT INTO event_products(event_id,version,id,name,icon,price_cents) SELECT NEW.id,NEW.version,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.icon'),json_extract(value,'$.priceCents') FROM json_each(NEW.payload_json,'$.products'); END;
CREATE TRIGGER event_products_update AFTER UPDATE ON events BEGIN
 INSERT INTO event_products(event_id,version,id,name,icon,price_cents) SELECT NEW.id,NEW.version,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.icon'),json_extract(value,'$.priceCents') FROM json_each(NEW.payload_json,'$.products'); END;
CREATE TRIGGER events_audit_insert AFTER INSERT ON events BEGIN
 INSERT INTO event_audit(id,event_id,resource_id,resource_type,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('event-'||NEW.id||'-'||NEW.version,NEW.id,NEW.id,'event','create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,NEW.payload_json); END;
CREATE TRIGGER events_audit_update AFTER UPDATE ON events BEGIN
 INSERT INTO event_audit(id,event_id,resource_id,resource_type,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('event-'||NEW.id||'-'||NEW.version,NEW.id,NEW.id,'event','update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,OLD.payload_json,NEW.payload_json); END;
CREATE TRIGGER events_delete_without_orders BEFORE UPDATE OF deleted_at ON events
WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_orders WHERE event_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'EVENT_HAS_ORDERS'); END;
CREATE TRIGGER events_preserve_deleted BEFORE UPDATE ON events
WHEN OLD.deleted_at IS NOT NULL
BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;
CREATE TRIGGER events_preserve_supplies BEFORE UPDATE OF deleted_at ON events
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM event_supplies WHERE event_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'EVENT_HAS_SUPPLIES'); END;
CREATE TRIGGER events_delivery_locked BEFORE UPDATE OF delivery_enabled ON events
WHEN NEW.delivery_enabled=0 AND OLD.delivery_enabled=1 AND EXISTS (
  SELECT 1 FROM event_orders WHERE event_id=NEW.id AND (
    json_extract(payload_json,'$.fulfillmentMode') IS NOT NULL
    OR json_extract(payload_json,'$.address') IS NOT NULL
    OR coalesce(json_extract(payload_json,'$.contactPhone'),'')!=''
    OR coalesce(json_extract(payload_json,'$.fulfilled'),0)!=0
  )
)
BEGIN SELECT RAISE(ABORT,'EVENT_DELIVERY_LOCKED'); END;
CREATE TRIGGER events_mode_exclusive_insert BEFORE INSERT ON events WHEN NEW.delivery_enabled+NEW.canteen_enabled>1 BEGIN SELECT RAISE(ABORT,'EVENT_MODALITY_LOCKED'); END;
CREATE TRIGGER events_mode_locked BEFORE UPDATE OF delivery_enabled,canteen_enabled ON events
WHEN NEW.delivery_enabled+NEW.canteen_enabled>1 OR ((NEW.canteen_enabled!=OLD.canteen_enabled) AND EXISTS(SELECT 1 FROM event_orders WHERE event_id=NEW.id))
BEGIN SELECT RAISE(ABORT,'EVENT_MODALITY_LOCKED'); END;
CREATE INDEX events_kind ON events(kind,deleted_at,name,id);
CREATE TRIGGER events_kind_locked BEFORE UPDATE OF kind ON events WHEN NEW.kind!=OLD.kind
BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;

CREATE TABLE product_stock_entries (
 id TEXT PRIMARY KEY NOT NULL,
 event_id TEXT NOT NULL REFERENCES events(id), product_id TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity BETWEEN 0 AND 9007199254740991),
 version INTEGER NOT NULL CHECK(version>0),
 created_at TEXT NOT NULL, created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL,
 updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL,
 last_operation TEXT NOT NULL, fingerprint TEXT NOT NULL
);
CREATE INDEX product_stock_entries_product ON product_stock_entries(event_id,product_id,created_at,id);
CREATE TABLE product_stock_audit (
 id TEXT PRIMARY KEY NOT NULL,event_id TEXT NOT NULL REFERENCES events(id),
 entry_id TEXT NOT NULL REFERENCES product_stock_entries(id),
 action TEXT NOT NULL CHECK(action IN('create','update')),
 actor_id INTEGER NOT NULL,actor_name TEXT NOT NULL,occurred_at TEXT NOT NULL,
 before_json TEXT,after_json TEXT NOT NULL CHECK(json_valid(after_json))
);
CREATE INDEX product_stock_audit_event ON product_stock_audit(event_id,occurred_at DESC,id DESC);
CREATE VIEW product_stock_balances AS
SELECT event_id,product_id,sum(delta) AS quantity FROM (
 SELECT event_id,product_id,quantity AS delta FROM product_stock_entries
 UNION ALL
 SELECT o.event_id,json_extract(w.value,'$.productId'),-json_extract(w.value,'$.quantity')
 FROM event_orders o JOIN events e ON e.id=o.event_id, json_each(o.payload_json,'$.withdrawals') w
 WHERE e.kind='product_category'
) GROUP BY event_id,product_id;

CREATE TRIGGER product_stock_entry_create_guard BEFORE INSERT ON product_stock_entries BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events e,json_each(e.payload_json,'$.products') p
 WHERE e.id=NEW.event_id AND e.kind='product_category' AND e.deleted_at IS NULL
 AND json_extract(p.value,'$.id')=NEW.product_id) THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN NEW.version!=1 OR NEW.quantity=0 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN coalesce((SELECT sum(quantity) FROM product_stock_entries WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0)>9007199254740991-NEW.quantity
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
END;
CREATE TRIGGER product_stock_entry_update_guard BEFORE UPDATE ON product_stock_entries BEGIN
 SELECT CASE WHEN NEW.id!=OLD.id OR NEW.event_id!=OLD.event_id OR NEW.product_id!=OLD.product_id
 OR NEW.version!=OLD.version+1 OR NEW.created_at!=OLD.created_at OR NEW.created_by!=OLD.created_by OR NEW.created_by_name!=OLD.created_by_name
 OR NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind='product_category' AND deleted_at IS NULL)
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0)+NEW.quantity-OLD.quantity<0
 THEN RAISE(ABORT,'STOCK_ENTRY_REDUCTION_BLOCKED') END;
 SELECT CASE WHEN coalesce((SELECT sum(quantity) FROM product_stock_entries WHERE event_id=NEW.event_id AND product_id=NEW.product_id AND id!=NEW.id),0)>9007199254740991-NEW.quantity
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
END;
CREATE TRIGGER product_stock_entry_no_delete BEFORE DELETE ON product_stock_entries
BEGIN SELECT RAISE(ABORT,'STOCK_CHANGED'); END;
CREATE TRIGGER recurring_category_preserve_stock BEFORE UPDATE ON events WHEN OLD.kind='product_category' BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM product_stock_entries WHERE event_id=OLD.id)
 THEN RAISE(ABORT,'STOCK_HAS_ENTRIES') END;
 SELECT CASE WHEN EXISTS(
 SELECT 1 FROM json_each(OLD.payload_json,'$.products') p WHERE NOT EXISTS(
 SELECT 1 FROM json_each(NEW.payload_json,'$.products') n WHERE json_extract(n.value,'$.id')=json_extract(p.value,'$.id'))
 AND (EXISTS(SELECT 1 FROM product_stock_entries s WHERE s.event_id=OLD.id AND s.product_id=json_extract(p.value,'$.id'))
 OR EXISTS(SELECT 1 FROM event_orders o,json_each(o.payload_json,'$.items') i WHERE o.event_id=OLD.id AND json_extract(i.value,'$.id')=json_extract(p.value,'$.id'))))
 THEN RAISE(ABORT,'STOCK_PRODUCT_IN_USE') END;
END;
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
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') w WHERE
 json_extract(w.value,'$.quantity')-0>coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=json_extract(w.value,'$.productId')),0))
 THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)
 THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
 SELECT CASE WHEN json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT NULL
 OR json_extract(NEW.payload_json,'$.address') IS NOT NULL OR coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')!=''
 OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR json_type(NEW.payload_json,'$.collected') IS NOT NULL
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
END;
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
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') w WHERE
 json_extract(w.value,'$.quantity')-coalesce((SELECT json_extract(v.value,'$.quantity') FROM json_each(OLD.payload_json,'$.withdrawals') v WHERE json_extract(v.value,'$.productId')=json_extract(w.value,'$.productId')),0)>coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=json_extract(w.value,'$.productId')),0))
 THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.withdrawals') WHERE json_extract(value,'$.quantity')>0)
 THEN RAISE(ABORT,'ORDER_HAS_WITHDRAWALS') END;
 SELECT CASE WHEN json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT NULL
 OR json_extract(NEW.payload_json,'$.address') IS NOT NULL OR coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')!=''
 OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0 OR json_type(NEW.payload_json,'$.collected') IS NOT NULL
 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
END;
CREATE TRIGGER product_stock_entry_audit_insert AFTER INSERT ON product_stock_entries BEGIN
 INSERT INTO product_stock_audit(id,event_id,entry_id,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('stock-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,'create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,json_object('productId',NEW.product_id,'productName',coalesce((SELECT json_extract(p.value,'$.name') FROM events e,json_each(e.payload_json,'$.products') p WHERE e.id=NEW.event_id AND json_extract(p.value,'$.id')=NEW.product_id),''),'quantity',NEW.quantity,'version',NEW.version));
END;
CREATE TRIGGER product_stock_entry_audit_update AFTER UPDATE ON product_stock_entries BEGIN
 INSERT INTO product_stock_audit(id,event_id,entry_id,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('stock-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,'update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('productId',OLD.product_id,'productName',coalesce((SELECT json_extract(p.value,'$.name') FROM events e,json_each(e.payload_json,'$.products') p WHERE e.id=OLD.event_id AND json_extract(p.value,'$.id')=OLD.product_id),''),'quantity',OLD.quantity,'version',OLD.version),json_object('productId',NEW.product_id,'productName',coalesce((SELECT json_extract(p.value,'$.name') FROM events e,json_each(e.payload_json,'$.products') p WHERE e.id=NEW.event_id AND json_extract(p.value,'$.id')=NEW.product_id),''),'quantity',NEW.quantity,'version',NEW.version));
END;
