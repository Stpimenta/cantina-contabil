-- Editable supplies, atomic balance recalculation and logical deletion.
ALTER TABLE event_supplies ADD COLUMN deleted_at TEXT;
ALTER TABLE event_supplies ADD COLUMN deleted_by INTEGER;
ALTER TABLE event_supplies ADD COLUMN deleted_by_name TEXT;
CREATE INDEX event_supplies_active_event ON event_supplies(event_id,deleted_at,created_at DESC,id DESC);
DROP TRIGGER supplies_receive_only;
DROP TRIGGER supplies_active_event;
DROP TRIGGER supplies_active_box;
DROP TRIGGER supplies_precision;
DROP TRIGGER supplies_sufficient_balance;
DROP TRIGGER supplies_audit_create;
DROP TRIGGER supplies_audit_update;
CREATE TRIGGER supplies_active_event BEFORE INSERT ON event_supplies
 WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'SUPPLY_EVENT_UNAVAILABLE'); END;
CREATE TRIGGER supplies_active_box BEFORE INSERT ON event_supplies
 WHEN NEW.source='purchase' AND NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'SUPPLY_BOX_UNAVAILABLE'); END;
CREATE TRIGGER supplies_precision BEFORE INSERT ON event_supplies
 WHEN NEW.source='purchase' AND coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE source='purchase' AND deleted_at IS NULL AND cash_box_id=NEW.cash_box_id),0)>9007199254740991-NEW.amount_cents
 BEGIN SELECT RAISE(ABORT,'SUPPLY_AMOUNT_LIMIT'); END;
CREATE TRIGGER supplies_sufficient_balance BEFORE INSERT ON event_supplies
 WHEN NEW.source='purchase' AND NEW.amount_cents >
 (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE source='purchase' AND deleted_at IS NULL AND cash_box_id=NEW.cash_box_id),0))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_INSUFFICIENT_BALANCE'); END;
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
 OR NEW.name IS NOT OLD.name OR NEW.icon IS NOT OLD.icon OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.source IS NOT OLD.source OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.cash_box_name IS NOT OLD.cash_box_name OR NEW.received IS NOT OLD.received OR NEW.receipt_key IS NOT OLD.receipt_key OR NEW.receipt_type IS NOT OLD.receipt_type))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_CHANGED'); END;
CREATE TRIGGER supplies_insert_not_deleted BEFORE INSERT ON event_supplies
 WHEN NEW.deleted_at IS NOT NULL OR NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'SUPPLY_CHANGED'); END;
CREATE TRIGGER supplies_audit_create AFTER INSERT ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,json_object('name',NEW.name,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received,'receiptKey',NEW.receipt_key,'receiptType',NEW.receipt_type,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name)); END;
CREATE TRIGGER supplies_audit_update AFTER UPDATE ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('name',OLD.name,'icon',OLD.icon,'amountCents',OLD.amount_cents,'source',OLD.source,'cashBoxId',OLD.cash_box_id,'cashBoxName',OLD.cash_box_name,'received',OLD.received,'receiptKey',OLD.receipt_key,'receiptType',OLD.receipt_type,'deletedAt',OLD.deleted_at,'deletedBy',OLD.deleted_by,'deletedByName',OLD.deleted_by_name),json_object('name',NEW.name,'icon',NEW.icon,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received,'receiptKey',NEW.receipt_key,'receiptType',NEW.receipt_type,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name)); END;
