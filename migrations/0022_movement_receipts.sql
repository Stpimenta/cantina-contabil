-- Optional private receipts; old movements keep empty lists and unchanged audit.
ALTER TABLE cash_movements ADD COLUMN receipts_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(receipts_json) AND json_type(receipts_json)='array' AND json_array_length(receipts_json)<=5);
DROP TRIGGER movements_update_guard;
DROP TRIGGER movements_insert_audit;
DROP TRIGGER movements_update_audit;
CREATE TRIGGER movements_update_guard BEFORE UPDATE ON cash_movements
 WHEN OLD.deleted_at IS NOT NULL OR NEW.version!=OLD.version+1
 OR NEW.id IS NOT OLD.id OR NEW.fingerprint IS NOT OLD.fingerprint
 OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by OR NEW.created_by_name IS NOT OLD.created_by_name
 OR (NEW.deleted_at IS NULL AND (NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL))
 OR (NEW.deleted_at IS NOT NULL AND (NEW.deleted_by IS NOT NEW.updated_by OR NEW.deleted_by_name IS NOT NEW.updated_by_name OR NEW.deleted_by IS NULL OR NEW.deleted_by_name IS NULL OR NEW.deleted_at IS NOT NEW.updated_at
 OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.cash_box_name IS NOT OLD.cash_box_name OR NEW.direction IS NOT OLD.direction OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.occurred_on IS NOT OLD.occurred_on OR NEW.reason IS NOT OLD.reason OR NEW.receipts_json IS NOT OLD.receipts_json))
 BEGIN SELECT RAISE(ABORT,'MOVEMENT_CHANGED'); END;
CREATE TRIGGER movements_insert_audit AFTER INSERT ON cash_movements BEGIN
 INSERT INTO cash_movement_audit(id,movement_id,cash_box_id,actor_id,actor_name,occurred_at,action,before_json,after_json)
 VALUES('movement-'||NEW.id||'-'||NEW.version,NEW.id,NEW.cash_box_id,NEW.updated_by,NEW.updated_by_name,NEW.updated_at,'create',NULL,json_object('id',NEW.id,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'direction',NEW.direction,'amountCents',NEW.amount_cents,'occurredOn',NEW.occurred_on,'reason',NEW.reason,'receipts',json(NEW.receipts_json),'receiptCount',json_array_length(NEW.receipts_json),'version',NEW.version,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name));
END;
CREATE TRIGGER movements_update_audit AFTER UPDATE ON cash_movements BEGIN
 INSERT INTO cash_movement_audit(id,movement_id,cash_box_id,actor_id,actor_name,occurred_at,action,before_json,after_json)
 VALUES('movement-'||NEW.id||'-'||NEW.version,NEW.id,NEW.cash_box_id,NEW.updated_by,NEW.updated_by_name,NEW.updated_at,CASE WHEN NEW.deleted_at IS NOT NULL THEN 'delete' ELSE 'update' END,json_object('id',OLD.id,'cashBoxId',OLD.cash_box_id,'cashBoxName',OLD.cash_box_name,'direction',OLD.direction,'amountCents',OLD.amount_cents,'occurredOn',OLD.occurred_on,'reason',OLD.reason,'receipts',json(OLD.receipts_json),'receiptCount',json_array_length(OLD.receipts_json),'version',OLD.version,'deletedAt',OLD.deleted_at,'deletedBy',OLD.deleted_by,'deletedByName',OLD.deleted_by_name),json_object('id',NEW.id,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'direction',NEW.direction,'amountCents',NEW.amount_cents,'occurredOn',NEW.occurred_on,'reason',NEW.reason,'receipts',json(NEW.receipts_json),'receiptCount',json_array_length(NEW.receipts_json),'version',NEW.version,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name));
END;
CREATE TRIGGER movements_receipts_insert BEFORE INSERT ON cash_movements WHEN
 (SELECT count(DISTINCT json_extract(value,'$.id')) FROM json_each(NEW.receipts_json))!=json_array_length(NEW.receipts_json)
 OR EXISTS(SELECT 1 FROM json_each(NEW.receipts_json)
 WHERE json_type(value)!='object' OR json_type(value,'$.id') IS NOT 'text' OR length(json_extract(value,'$.id'))!=36
 OR json_type(value,'$.key') IS NOT 'text' OR length(json_extract(value,'$.key'))=0
 OR json_type(value,'$.type') IS NOT 'text' OR json_extract(value,'$.type') NOT IN ('image/jpeg','image/png','image/webp','application/pdf')
 OR json_type(value,'$.size') NOT IN ('null','integer') OR json_type(value,'$.size') IS NULL
 OR (json_type(value,'$.size')='integer' AND json_extract(value,'$.size') NOT BETWEEN 1 AND 5242880))
 BEGIN SELECT RAISE(ABORT,'MOVEMENT_INVALID_RECEIPTS'); END;
CREATE TRIGGER movements_receipts_update BEFORE UPDATE ON cash_movements WHEN
 (SELECT count(DISTINCT json_extract(value,'$.id')) FROM json_each(NEW.receipts_json))!=json_array_length(NEW.receipts_json)
 OR EXISTS(SELECT 1 FROM json_each(NEW.receipts_json)
 WHERE json_type(value)!='object' OR json_type(value,'$.id') IS NOT 'text' OR length(json_extract(value,'$.id'))!=36
 OR json_type(value,'$.key') IS NOT 'text' OR length(json_extract(value,'$.key'))=0
 OR json_type(value,'$.type') IS NOT 'text' OR json_extract(value,'$.type') NOT IN ('image/jpeg','image/png','image/webp','application/pdf')
 OR json_type(value,'$.size') NOT IN ('null','integer') OR json_type(value,'$.size') IS NULL
 OR (json_type(value,'$.size')='integer' AND json_extract(value,'$.size') NOT BETWEEN 1 AND 5242880))
 BEGIN SELECT RAISE(ABORT,'MOVEMENT_INVALID_RECEIPTS'); END;
