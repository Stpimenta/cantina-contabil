-- Logical stock-entry deletion preserves original quantity and immutable audit snapshots.
ALTER TABLE product_stock_entries ADD COLUMN deleted_at TEXT;
ALTER TABLE product_stock_entries ADD COLUMN deleted_by INTEGER;
ALTER TABLE product_stock_entries ADD COLUMN deleted_by_name TEXT;
CREATE INDEX product_stock_entries_active ON product_stock_entries(event_id,product_id,deleted_at,created_at,id);
DROP TRIGGER product_stock_entry_create_guard;
DROP TRIGGER product_stock_entry_update_guard;
DROP TRIGGER product_stock_entry_audit_update;
DROP VIEW product_stock_balances;
CREATE VIEW product_stock_balances AS
SELECT event_id,product_id,sum(delta) AS quantity FROM (
 SELECT event_id,product_id,quantity AS delta FROM product_stock_entries WHERE deleted_at IS NULL
 UNION ALL
 SELECT o.event_id,json_extract(w.value,'$.productId'),-json_extract(w.value,'$.quantity')
 FROM event_orders o JOIN events e ON e.id=o.event_id, json_each(o.payload_json,'$.withdrawals') w
 WHERE e.kind='product_category'
) GROUP BY event_id,product_id;
CREATE TRIGGER product_stock_entry_create_guard BEFORE INSERT ON product_stock_entries BEGIN
 SELECT CASE WHEN NEW.deleted_at IS NOT NULL OR NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM events e,json_each(e.payload_json,'$.products') p
 WHERE e.id=NEW.event_id AND e.kind='product_category' AND e.deleted_at IS NULL
 AND json_extract(p.value,'$.id')=NEW.product_id) THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN NEW.version!=1 OR NEW.quantity=0 THEN RAISE(ABORT,'INVALID_STOCK_INPUT') END;
 SELECT CASE WHEN coalesce((SELECT sum(quantity) FROM product_stock_entries WHERE event_id=NEW.event_id AND product_id=NEW.product_id AND deleted_at IS NULL),0)>9007199254740991-NEW.quantity
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
END;
CREATE TRIGGER product_stock_entry_update_guard BEFORE UPDATE ON product_stock_entries BEGIN
 SELECT CASE WHEN OLD.deleted_at IS NOT NULL OR NEW.id!=OLD.id OR NEW.event_id!=OLD.event_id OR NEW.product_id!=OLD.product_id
 OR NEW.version!=OLD.version+1 OR NEW.created_at!=OLD.created_at OR NEW.created_by!=OLD.created_by OR NEW.created_by_name!=OLD.created_by_name
 OR NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND kind='product_category' AND deleted_at IS NULL)
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN (NEW.deleted_at IS NULL AND (NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL))
 OR (NEW.deleted_at IS NOT NULL AND (NEW.deleted_by IS NULL OR NEW.deleted_by_name IS NULL OR NEW.quantity!=OLD.quantity))
 THEN RAISE(ABORT,'STOCK_CHANGED') END;
 SELECT CASE WHEN coalesce((SELECT quantity FROM product_stock_balances WHERE event_id=NEW.event_id AND product_id=NEW.product_id),0)+(CASE WHEN NEW.deleted_at IS NULL THEN NEW.quantity ELSE 0 END)-OLD.quantity<0
 THEN RAISE(ABORT,'STOCK_ENTRY_REDUCTION_BLOCKED') END;
 SELECT CASE WHEN coalesce((SELECT sum(quantity) FROM product_stock_entries WHERE event_id=NEW.event_id AND product_id=NEW.product_id AND id!=NEW.id AND deleted_at IS NULL),0)>9007199254740991-(CASE WHEN NEW.deleted_at IS NULL THEN NEW.quantity ELSE 0 END)
 THEN RAISE(ABORT,'STOCK_LIMIT') END;
END;
CREATE TRIGGER product_stock_entry_audit_update AFTER UPDATE ON product_stock_entries BEGIN
 INSERT INTO product_stock_audit(id,event_id,entry_id,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('stock-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,'update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('productId',OLD.product_id,'productName',coalesce((SELECT json_extract(p.value,'$.name') FROM events e,json_each(e.payload_json,'$.products') p WHERE e.id=OLD.event_id AND json_extract(p.value,'$.id')=OLD.product_id),''),'quantity',OLD.quantity,'version',OLD.version,'deletedAt',OLD.deleted_at,'deletedBy',OLD.deleted_by,'deletedByName',OLD.deleted_by_name),json_object('productId',NEW.product_id,'productName',coalesce((SELECT json_extract(p.value,'$.name') FROM events e,json_each(e.payload_json,'$.products') p WHERE e.id=NEW.event_id AND json_extract(p.value,'$.id')=NEW.product_id),''),'quantity',NEW.quantity,'version',NEW.version,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name));
END;
