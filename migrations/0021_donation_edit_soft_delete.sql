-- Versioned donation corrections, soft deletion and preserved history.
ALTER TABLE donations ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE donations ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE donations ADD COLUMN updated_by INTEGER NOT NULL DEFAULT 0;
ALTER TABLE donations ADD COLUMN updated_by_name TEXT NOT NULL DEFAULT '';
UPDATE donations SET updated_at=created_at,updated_by=created_by,updated_by_name=created_by_name;
CREATE TABLE donation_audit (
 id TEXT PRIMARY KEY NOT NULL,
 donation_id TEXT NOT NULL REFERENCES donations(id),
 cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id),
 action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
 actor_id INTEGER NOT NULL,actor_name TEXT NOT NULL,occurred_at TEXT NOT NULL,
 before_json TEXT CHECK(before_json IS NULL OR json_valid(before_json)),
 after_json TEXT NOT NULL CHECK(json_valid(after_json))
);
CREATE INDEX donation_audit_box ON donation_audit(cash_box_id,occurred_at DESC,id DESC);
INSERT INTO donation_audit(id,donation_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 SELECT 'donation-'||d.id||'-'||d.version,d.id,d.cash_box_id,'create',d.created_by,d.created_by_name,d.created_at,NULL,json_object('id',d.id,'cashBoxId',d.cash_box_id,'amountCents',d.amount_cents,'donatedOn',d.donated_on,'donorName',d.donor_name,'note',d.note,'version',d.version,'deletedAt',d.deleted_at,'deletedBy',d.deleted_by,'deletedByName',d.deleted_by_name,'cashBoxName',(SELECT name FROM cash_boxes WHERE id=d.cash_box_id)) FROM donations d;
CREATE TRIGGER donations_insert_version BEFORE INSERT ON donations
 WHEN NEW.version!=1 OR NEW.deleted_at IS NOT NULL OR NEW.deleted_by IS NOT NULL OR NEW.deleted_by_name IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'DONATION_CHANGED'); END;
CREATE TRIGGER donations_update_guard BEFORE UPDATE ON donations
 WHEN OLD.deleted_at IS NOT NULL OR NEW.version!=OLD.version+1
 OR NEW.id IS NOT OLD.id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by OR NEW.created_by_name IS NOT OLD.created_by_name
 OR (NEW.deleted_at IS NOT NULL AND (NEW.deleted_by IS NOT NEW.updated_by OR NEW.deleted_by_name IS NOT NEW.updated_by_name OR NEW.deleted_at IS NOT NEW.updated_at
 OR NEW.cash_box_id IS NOT OLD.cash_box_id OR NEW.amount_cents IS NOT OLD.amount_cents OR NEW.donated_on IS NOT OLD.donated_on OR NEW.donor_name IS NOT OLD.donor_name OR NEW.note IS NOT OLD.note))
 BEGIN SELECT RAISE(ABORT,'DONATION_CHANGED'); END;
CREATE TRIGGER donations_update_active_box BEFORE UPDATE ON donations
 WHEN NEW.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id=NEW.cash_box_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'DONATION_BOX_UNAVAILABLE'); END;
CREATE TRIGGER donations_no_physical_delete BEFORE DELETE ON donations BEGIN SELECT RAISE(ABORT,'DONATION_CHANGED'); END;
CREATE TRIGGER donation_audit_no_update BEFORE UPDATE ON donation_audit BEGIN SELECT RAISE(ABORT,'DONATION_CHANGED'); END;
CREATE TRIGGER donation_audit_no_delete BEFORE DELETE ON donation_audit BEGIN SELECT RAISE(ABORT,'DONATION_CHANGED'); END;
CREATE TRIGGER donations_update_balance AFTER UPDATE ON donations BEGIN
 SELECT CASE WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))<0 OR (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=OLD.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=OLD.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0))<0 THEN RAISE(ABORT,'DONATION_INSUFFICIENT_BALANCE') END;
 SELECT CASE WHEN (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=NEW.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0))>9007199254740991 OR (coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=OLD.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0)
 -coalesce((SELECT sum(amount_cents) FROM event_supplies WHERE cash_box_id=OLD.cash_box_id AND source='purchase' AND deleted_at IS NULL),0)
 +coalesce((SELECT sum(CASE direction WHEN 'incoming' THEN amount_cents ELSE -amount_cents END) FROM cash_movements WHERE cash_box_id=OLD.cash_box_id AND deleted_at IS NULL),0))>9007199254740991 THEN RAISE(ABORT,'DONATION_BALANCE_LIMIT') END;
END;
CREATE TRIGGER donations_update_gross_precision BEFORE UPDATE ON donations
 WHEN NEW.deleted_at IS NULL AND NEW.amount_cents>9007199254740991-(
 coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL AND id!=OLD.id),0)
 +coalesce((SELECT sum(o.total_cents) FROM event_orders o JOIN events e ON e.id=o.event_id WHERE e.cash_box_id=NEW.cash_box_id AND o.paid=1 AND o.deleted_at IS NULL),0))
 BEGIN SELECT RAISE(ABORT,'DONATION_BALANCE_LIMIT'); END;
CREATE TRIGGER donations_audit_insert AFTER INSERT ON donations BEGIN
 INSERT INTO donation_audit(id,donation_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('donation-'||NEW.id||'-'||NEW.version,NEW.id,NEW.cash_box_id,'create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,json_object('id',NEW.id,'cashBoxId',NEW.cash_box_id,'amountCents',NEW.amount_cents,'donatedOn',NEW.donated_on,'donorName',NEW.donor_name,'note',NEW.note,'version',NEW.version,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name,'cashBoxName',(SELECT name FROM cash_boxes WHERE id=NEW.cash_box_id)));
END;
CREATE TRIGGER donations_audit_update AFTER UPDATE ON donations BEGIN
 INSERT INTO donation_audit(id,donation_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('donation-'||NEW.id||'-'||NEW.version,NEW.id,NEW.cash_box_id,CASE WHEN NEW.deleted_at IS NOT NULL THEN 'delete' ELSE 'update' END,NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('id',OLD.id,'cashBoxId',OLD.cash_box_id,'amountCents',OLD.amount_cents,'donatedOn',OLD.donated_on,'donorName',OLD.donor_name,'note',OLD.note,'version',OLD.version,'deletedAt',OLD.deleted_at,'deletedBy',OLD.deleted_by,'deletedByName',OLD.deleted_by_name,'cashBoxName',(SELECT name FROM cash_boxes WHERE id=OLD.cash_box_id)),json_object('id',NEW.id,'cashBoxId',NEW.cash_box_id,'amountCents',NEW.amount_cents,'donatedOn',NEW.donated_on,'donorName',NEW.donor_name,'note',NEW.note,'version',NEW.version,'deletedAt',NEW.deleted_at,'deletedBy',NEW.deleted_by,'deletedByName',NEW.deleted_by_name,'cashBoxName',(SELECT name FROM cash_boxes WHERE id=NEW.cash_box_id)));
END;
