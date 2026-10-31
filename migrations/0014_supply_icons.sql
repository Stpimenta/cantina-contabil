ALTER TABLE event_supplies ADD COLUMN icon TEXT NOT NULL DEFAULT 'bag';
DROP TRIGGER supplies_receive_only;
CREATE TRIGGER supplies_receive_only BEFORE UPDATE ON event_supplies
 WHEN OLD.source!='donation' OR OLD.received!=0 OR NEW.received!=1 OR NEW.version!=OLD.version+1
 OR NEW.icon IS NOT OLD.icon OR NEW.id IS NOT OLD.id OR NEW.event_id IS NOT OLD.event_id OR NEW.name IS NOT OLD.name OR NEW.amount_cents IS NOT OLD.amount_cents
 OR NEW.source IS NOT OLD.source OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.cash_box_name IS NOT OLD.cash_box_name
 OR NEW.receipt_key IS NOT OLD.receipt_key OR NEW.receipt_type IS NOT OLD.receipt_type OR NEW.created_at IS NOT OLD.created_at
 OR NEW.created_by IS NOT OLD.created_by OR NEW.created_by_name IS NOT OLD.created_by_name OR NEW.fingerprint IS NOT OLD.fingerprint
 BEGIN SELECT RAISE(ABORT,'SUPPLY_CHANGED'); END;

DROP TRIGGER supplies_audit_create;
DROP TRIGGER supplies_audit_update;
CREATE TRIGGER supplies_audit_create AFTER INSERT ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,json_object('name',NEW.name,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received)); END;
CREATE TRIGGER supplies_audit_update AFTER UPDATE ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('name',OLD.name,'icon',OLD.icon,'amountCents',OLD.amount_cents,'source',OLD.source,'cashBoxId',OLD.cash_box_id,'cashBoxName',OLD.cash_box_name,'received',OLD.received),json_object('name',NEW.name,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received)); END;
