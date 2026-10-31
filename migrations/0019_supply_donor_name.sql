-- Optional donor identity only for donated supplies; preserve existing records.
ALTER TABLE event_supplies ADD COLUMN donor_name TEXT NOT NULL DEFAULT '' CHECK(length(donor_name)<=100 AND (source='donation' OR donor_name=''));
DROP TRIGGER supplies_update_guard;
DROP TRIGGER supplies_audit_create;
DROP TRIGGER supplies_audit_update;
CREATE TRIGGER supplies_update_guard BEFORE UPDATE ON event_supplies
 WHEN OLD.deleted_at IS NOT NULL OR NEW.version!=OLD.version+1
 OR NEW.id IS NOT OLD.id OR NEW.event_id IS NOT OLD.event_id
 OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
 OR NEW.created_by_name IS NOT OLD.created_by_name OR NEW.fingerprint IS NOT OLD.fingerprint
 OR (NEW.deleted_at IS NULL AND (NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL))
 OR (NEW.deleted_at IS NOT NULL AND (NEW.deleted_by IS NULL OR NEW.deleted_by_name IS NULL
 OR NEW.deleted_by IS NOT NEW.updated_by OR NEW.deleted_by_name IS NOT NEW.updated_by_name
 OR NEW.deleted_at IS NOT NEW.updated_at
 OR NEW.donor_name IS NOT OLD.donor_name OR NEW.receipts_json IS NOT OLD.receipts_json OR NEW.description IS NOT OLD.description OR NEW.name IS NOT OLD.name OR NEW.icon IS NOT OLD.icon OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.source IS NOT OLD.source OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.cash_box_name IS NOT OLD.cash_box_name OR NEW.received IS NOT OLD.received OR NEW.receipt_key IS NOT OLD.receipt_key OR NEW.receipt_type IS NOT OLD.receipt_type))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_CHANGED'); END;
CREATE TRIGGER supplies_audit_create AFTER INSERT ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,json_object('name',NEW.name,'donorName',NEW.donor_name,'description',NEW.description,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received,'receipts',json(NEW.receipts_json),'receiptCount',json_array_length(NEW.receipts_json),'receiptKey',NEW.receipt_key,'receiptType',NEW.receipt_type,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name)); END;
CREATE TRIGGER supplies_audit_update AFTER UPDATE ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('name',OLD.name,'donorName',OLD.donor_name,'description',OLD.description,'icon',OLD.icon,'amountCents',OLD.amount_cents,'source',OLD.source,'cashBoxId',OLD.cash_box_id,'cashBoxName',OLD.cash_box_name,'received',OLD.received,'receipts',json(OLD.receipts_json),'receiptCount',json_array_length(OLD.receipts_json),'receiptKey',OLD.receipt_key,'receiptType',OLD.receipt_type,'deletedAt',OLD.deleted_at,'deletedBy',OLD.deleted_by,'deletedByName',OLD.deleted_by_name),json_object('name',NEW.name,'donorName',NEW.donor_name,'description',NEW.description,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received,'receipts',json(NEW.receipts_json),'receiptCount',json_array_length(NEW.receipts_json),'receiptKey',NEW.receipt_key,'receiptType',NEW.receipt_type,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name)); END;
