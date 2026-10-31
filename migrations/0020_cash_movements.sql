-- Manual cash movements, immutable audit and atomic financial guards.
CREATE TABLE cash_movements (
 id TEXT PRIMARY KEY NOT NULL,
 cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id),
 cash_box_name TEXT NOT NULL,
 direction TEXT NOT NULL CHECK(direction IN ('incoming','outgoing')),
 amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents)='integer' AND amount_cents BETWEEN 1 AND 9007199254740991),
 occurred_on TEXT NOT NULL CHECK(length(occurred_on)=10),
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
 version INTEGER NOT NULL CHECK(version>0),
 fingerprint TEXT NOT NULL,
 created_at TEXT NOT NULL, created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL,
 updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL,
 deleted_at TEXT, deleted_by INTEGER, deleted_by_name TEXT
);
CREATE INDEX cash_movements_active_date ON cash_movements(deleted_at,occurred_on DESC,created_at DESC,id DESC);
CREATE INDEX cash_movements_box ON cash_movements(cash_box_id,deleted_at);
CREATE TABLE cash_movement_audit (
 id TEXT PRIMARY KEY NOT NULL,
 movement_id TEXT NOT NULL REFERENCES cash_movements(id),
 cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id),
 actor_id INTEGER NOT NULL,actor_name TEXT NOT NULL,occurred_at TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
 before_json TEXT CHECK(before_json IS NULL OR json_valid(before_json)),
 after_json TEXT NOT NULL CHECK(json_valid(after_json))
);
CREATE INDEX cash_movement_audit_box ON cash_movement_audit(cash_box_id,occurred_at DESC,id DESC);
CREATE TRIGGER movements_insert_guard BEFORE INSERT ON cash_movements
 WHEN NEW.version!=1 OR NEW.deleted_at IS NOT NULL OR NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'MOVEMENT_CHANGED'); END;
CREATE TRIGGER movements_update_guard BEFORE UPDATE ON cash_movements
 WHEN OLD.deleted_at IS NOT NULL OR NEW.version!=OLD.version+1
 OR NEW.id IS NOT OLD.id OR NEW.fingerprint IS NOT OLD.fingerprint
 OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by OR NEW.created_by_name IS NOT OLD.created_by_name
 OR (NEW.deleted_at IS NULL AND (NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL))
 OR (NEW.deleted_at IS NOT NULL AND (NEW.deleted_by IS NOT NEW.updated_by OR NEW.deleted_by_name IS NOT NEW.updated_by_name OR NEW.deleted_by IS NULL OR NEW.deleted_by_name IS NULL OR NEW.deleted_at IS NOT NEW.updated_at
 OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.cash_box_name IS NOT OLD.cash_box_name OR NEW.direction IS NOT OLD.direction OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.occurred_on IS NOT OLD.occurred_on OR NEW.reason IS NOT OLD.reason))
 BEGIN SELECT RAISE(ABORT,'MOVEMENT_CHANGED'); END;
CREATE TRIGGER movements_no_physical_delete BEFORE DELETE ON cash_movements BEGIN SELECT RAISE(ABORT,'MOVEMENT_CHANGED'); END;
CREATE TRIGGER cash_boxes_preserve_movements BEFORE UPDATE OF deleted_at ON cash_boxes
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM cash_movements WHERE cash_box_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'CASH_BOX_HAS_MOVEMENTS'); END;
CREATE TRIGGER movements_audit_immutable_update BEFORE UPDATE ON cash_movement_audit BEGIN SELECT RAISE(ABORT,'MOVEMENT_CHANGED'); END;
CREATE TRIGGER movements_audit_immutable_delete BEFORE DELETE ON cash_movement_audit BEGIN SELECT RAISE(ABORT,'MOVEMENT_CHANGED'); END;
CREATE TRIGGER movements_insert_active_box BEFORE INSERT ON cash_movements
 WHEN NEW.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'MOVEMENT_BOX_UNAVAILABLE'); END;
CREATE TRIGGER movements_insert_balance AFTER INSERT ON cash_movements BEGIN
 SELECT CASE WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))<0 THEN RAISE(ABORT,'MOVEMENT_INSUFFICIENT_BALANCE') END;
 SELECT CASE WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))>9007199254740991 THEN RAISE(ABORT,'MOVEMENT_AMOUNT_LIMIT') END;
END;
CREATE TRIGGER movements_insert_audit AFTER INSERT ON cash_movements BEGIN
 INSERT INTO cash_movement_audit(id,movement_id,cash_box_id,actor_id,actor_name,occurred_at,action,before_json,after_json)
 VALUES('movement-'||NEW.id||'-'||NEW.version,NEW.id,NEW.cash_box_id,NEW.updated_by,NEW.updated_by_name,NEW.updated_at,'create',NULL,json_object('id',NEW.id,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'direction',NEW.direction,'amountCents',NEW.amount_cents,'occurredOn',NEW.occurred_on,'reason',NEW.reason,'version',NEW.version,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name));
END;
CREATE TRIGGER movements_update_active_box BEFORE UPDATE ON cash_movements
 WHEN NEW.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'MOVEMENT_BOX_UNAVAILABLE'); END;
CREATE TRIGGER movements_update_balance AFTER UPDATE ON cash_movements BEGIN
 SELECT CASE WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))<0 OR (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=OLD.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=OLD.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0))<0 THEN RAISE(ABORT,'MOVEMENT_INSUFFICIENT_BALANCE') END;
 SELECT CASE WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))>9007199254740991 OR (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=OLD.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=OLD.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0))>9007199254740991 THEN RAISE(ABORT,'MOVEMENT_AMOUNT_LIMIT') END;
END;
CREATE TRIGGER movements_update_audit AFTER UPDATE ON cash_movements BEGIN
 INSERT INTO cash_movement_audit(id,movement_id,cash_box_id,actor_id,actor_name,occurred_at,action,before_json,after_json)
 VALUES('movement-'||NEW.id||'-'||NEW.version,NEW.id,NEW.cash_box_id,NEW.updated_by,NEW.updated_by_name,NEW.updated_at,CASE WHEN NEW.deleted_at IS NOT NULL THEN 'delete' ELSE 'update' END,json_object('id',OLD.id,'cashBoxId',OLD.cash_box_id,'cashBoxName',OLD.cash_box_name,'direction',OLD.direction,'amountCents',OLD.amount_cents,'occurredOn',OLD.occurred_on,'reason',OLD.reason,'version',OLD.version,'deletedAt',OLD.deleted_at,'deletedBy',OLD.deleted_by,'deletedByName',OLD.deleted_by_name),json_object('id',NEW.id,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'direction',NEW.direction,'amountCents',NEW.amount_cents,'occurredOn',NEW.occurred_on,'reason',NEW.reason,'version',NEW.version,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name));
END;
DROP TRIGGER supplies_sufficient_balance;
DROP TRIGGER supplies_update_sufficient_balance;
CREATE TRIGGER supplies_sufficient_balance BEFORE INSERT ON event_supplies
 WHEN NEW.source='purchase' AND NEW.amount_cents>(coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))
 BEGIN SELECT RAISE(ABORT,'SUPPLY_INSUFFICIENT_BALANCE'); END;
CREATE TRIGGER supplies_update_sufficient_balance BEFORE UPDATE ON event_supplies
 WHEN NEW.deleted_at IS NULL AND NEW.source='purchase' AND NEW.amount_cents>((coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))+CASE WHEN OLD.source='purchase' AND OLD.deleted_at IS NULL AND OLD.cash_box_id=NEW.cash_box_id THEN OLD.amount_cents ELSE 0 END)
 BEGIN SELECT RAISE(ABORT,'SUPPLY_INSUFFICIENT_BALANCE'); END;
CREATE TRIGGER donations_movement_precision_insert AFTER INSERT ON donations
 WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))>9007199254740991
 BEGIN SELECT RAISE(ABORT,'DONATION_BALANCE_LIMIT'); END;
CREATE TRIGGER donations_movement_precision_update AFTER UPDATE ON donations
 WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))>9007199254740991
 BEGIN SELECT RAISE(ABORT,'DONATION_BALANCE_LIMIT'); END;
CREATE TRIGGER event_orders_movement_precision_insert AFTER INSERT ON event_orders
 WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0))>9007199254740991
 BEGIN SELECT RAISE(ABORT,'EVENT_AMOUNT_LIMIT'); END;
CREATE TRIGGER event_orders_movement_precision_update AFTER UPDATE ON event_orders
 WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=(SELECT cash_box_id FROM events WHERE id=NEW.event_id) AND deleted_at IS NULL),0))>9007199254740991
 BEGIN SELECT RAISE(ABORT,'EVENT_AMOUNT_LIMIT'); END;
CREATE TRIGGER event_supplies_movement_precision_insert AFTER INSERT ON event_supplies
 WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))>9007199254740991
 BEGIN SELECT RAISE(ABORT,'SUPPLY_AMOUNT_LIMIT'); END;
CREATE TRIGGER event_supplies_movement_precision_update AFTER UPDATE ON event_supplies
 WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))>9007199254740991
 BEGIN SELECT RAISE(ABORT,'SUPPLY_AMOUNT_LIMIT'); END;
CREATE TRIGGER supplies_old_box_movement_precision AFTER UPDATE ON event_supplies
 WHEN OLD.cash_box_id IS NOT NULL AND (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=OLD.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=OLD.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0))>9007199254740991
 BEGIN SELECT RAISE(ABORT,'SUPPLY_AMOUNT_LIMIT'); END;
