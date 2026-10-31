-- Multiple private receipts; preserve all legacy keys and previous audit entries.
ALTER TABLE event_supplies ADD COLUMN receipts_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(receipts_json) AND json_type(receipts_json)='array' AND json_array_length(receipts_json)<=5);
DROP TRIGGER supplies_update_guard;
DROP TRIGGER supplies_audit_create;
DROP TRIGGER supplies_audit_update;
DROP TRIGGER supplies_update_active_event;
DROP TRIGGER supplies_update_active_box;
DROP TRIGGER supplies_update_precision;
DROP TRIGGER supplies_update_sufficient_balance;
UPDATE event_supplies SET receipts_json=json_array(json_object('id',id,'key',receipt_key,'type',receipt_type,'size',NULL)) WHERE receipt_key IS NOT NULL;
CREATE TRIGGER supplies_update_active_event BEFORE UPDATE ON event_supplies
 WHEN NEW.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'SUPPLY_EVENT_UNAVAILABLE'); END;
CREATE TRIGGER supplies_update_active_box BEFORE UPDATE ON event_supplies
 WHEN NEW.deleted_at IS NULL AND NEW.source='purchase' AND NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'SUPPLY_BOX_UNAVAILABLE'); END;
CREATE TRIGGER supplies_update_precision BEFORE UPDATE ON event_supplies
 WHEN NEW.deleted_at IS NULL AND NEW.source='purchase' AND coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE source='purchase' AND deleted_at IS NULL AND id!=OLD.id AND cash_box_id=NEW.cash_box_id),0)>9007199254740991-NEW.amount_cents
 BEGIN SELECT RAISE(ABORT,'SUPPLY_AMOUNT_LIMIT'); END;
CREATE TRIGGER supplies_update_sufficient_balance BEFORE UPDATE ON event_supplies
 WHEN NEW.deleted_at IS NULL AND NEW.source='purchase' AND NEW.amount_cents >
 (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE source='purchase' AND deleted_at IS NULL AND id!=OLD.id AND cash_box_id=NEW.cash_box_id),0))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_INSUFFICIENT_BALANCE'); END;

CREATE TRIGGER supplies_update_guard BEFORE UPDATE ON event_supplies
 WHEN OLD.deleted_at IS NOT NULL OR NEW.version!=OLD.version+1
 OR NEW.id IS NOT OLD.id OR NEW.event_id IS NOT OLD.event_id
 OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
 OR NEW.created_by_name IS NOT OLD.created_by_name OR NEW.fingerprint IS NOT OLD.fingerprint
 OR (NEW.deleted_at IS NULL AND (NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL))
 OR (NEW.deleted_at IS NOT NULL AND (NEW.deleted_by IS NULL OR NEW.deleted_by_name IS NULL
 OR NEW.deleted_by IS NOT NEW.updated_by OR NEW.deleted_by_name IS NOT NEW.updated_by_name
 OR NEW.deleted_at IS NOT NEW.updated_at
 OR NEW.receipts_json IS NOT OLD.receipts_json OR NEW.description IS NOT OLD.description OR NEW.name IS NOT OLD.name OR NEW.icon IS NOT OLD.icon OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.source IS NOT OLD.source OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.cash_box_name IS NOT OLD.cash_box_name OR NEW.received IS NOT OLD.received OR NEW.receipt_key IS NOT OLD.receipt_key OR NEW.receipt_type IS NOT OLD.receipt_type))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_CHANGED'); END;
CREATE TRIGGER supplies_audit_create AFTER INSERT ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,json_object('name',NEW.name,'description',NEW.description,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received,'receipts',json(NEW.receipts_json),'receiptCount',json_array_length(NEW.receipts_json),'receiptKey',NEW.receipt_key,'receiptType',NEW.receipt_type,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name)); END;
CREATE TRIGGER supplies_audit_update AFTER UPDATE ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('name',OLD.name,'description',OLD.description,'icon',OLD.icon,'amountCents',OLD.amount_cents,'source',OLD.source,'cashBoxId',OLD.cash_box_id,'cashBoxName',OLD.cash_box_name,'received',OLD.received,'receipts',json(OLD.receipts_json),'receiptCount',json_array_length(OLD.receipts_json),'receiptKey',OLD.receipt_key,'receiptType',OLD.receipt_type,'deletedAt',OLD.deleted_at,'deletedBy',OLD.deleted_by,'deletedByName',OLD.deleted_by_name),json_object('name',NEW.name,'description',NEW.description,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received,'receipts',json(NEW.receipts_json),'receiptCount',json_array_length(NEW.receipts_json),'receiptKey',NEW.receipt_key,'receiptType',NEW.receipt_type,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name)); END;
CREATE TRIGGER supplies_receipts_insert BEFORE INSERT ON event_supplies WHEN NEW.receipt_key IS NOT json_extract(NEW.receipts_json,'$[0].key')
 OR NEW.receipt_type IS NOT json_extract(NEW.receipts_json,'$[0].type')
 OR (NEW.source='purchase' AND json_array_length(NEW.receipts_json)=0)
 OR (SELECT count(DISTINCT json_extract(value,'$.id')) FROM json_each(NEW.receipts_json))!=json_array_length(NEW.receipts_json)
 OR EXISTS(SELECT 1 FROM json_each(NEW.receipts_json)
 WHERE json_type(value)!='object' OR json_type(value,'$.id') IS NOT 'text' OR length(json_extract(value,'$.id'))!=36
 OR json_type(value,'$.key') IS NOT 'text' OR length(json_extract(value,'$.key'))=0
 OR json_type(value,'$.type') IS NOT 'text' OR json_extract(value,'$.type') NOT IN ('image/jpeg','image/png','image/webp','application/pdf')
 OR json_type(value,'$.size') NOT IN ('null','integer') OR json_type(value,'$.size') IS NULL
 OR (json_type(value,'$.size')='integer' AND json_extract(value,'$.size') NOT BETWEEN 1 AND 5242880))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_INVALID_RECEIPTS'); END;
CREATE TRIGGER supplies_receipts_update BEFORE UPDATE ON event_supplies WHEN NEW.receipt_key IS NOT json_extract(NEW.receipts_json,'$[0].key')
 OR NEW.receipt_type IS NOT json_extract(NEW.receipts_json,'$[0].type')
 OR (NEW.source='purchase' AND json_array_length(NEW.receipts_json)=0)
 OR (SELECT count(DISTINCT json_extract(value,'$.id')) FROM json_each(NEW.receipts_json))!=json_array_length(NEW.receipts_json)
 OR EXISTS(SELECT 1 FROM json_each(NEW.receipts_json)
 WHERE json_type(value)!='object' OR json_type(value,'$.id') IS NOT 'text' OR length(json_extract(value,'$.id'))!=36
 OR json_type(value,'$.key') IS NOT 'text' OR length(json_extract(value,'$.key'))=0
 OR json_type(value,'$.type') IS NOT 'text' OR json_extract(value,'$.type') NOT IN ('image/jpeg','image/png','image/webp','application/pdf')
 OR json_type(value,'$.size') NOT IN ('null','integer') OR json_type(value,'$.size') IS NULL
 OR (json_type(value,'$.size')='integer' AND json_extract(value,'$.size') NOT BETWEEN 1 AND 5242880))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_INVALID_RECEIPTS'); END;
