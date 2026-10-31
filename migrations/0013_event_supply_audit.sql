CREATE TABLE event_supply_audit (
 id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL REFERENCES events(id), supply_id TEXT NOT NULL REFERENCES event_supplies(id), cash_box_id TEXT REFERENCES cash_boxes(id),
 action TEXT NOT NULL CHECK(action IN('create','update')), actor_id INTEGER NOT NULL, actor_name TEXT NOT NULL, occurred_at TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL CHECK(json_valid(after_json))
);
CREATE INDEX event_supply_audit_event ON event_supply_audit(event_id,occurred_at DESC,id DESC);
CREATE INDEX event_supply_audit_box ON event_supply_audit(cash_box_id,occurred_at DESC,id DESC);
CREATE TRIGGER supplies_audit_create AFTER INSERT ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,json_object('name',NEW.name,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received)); END;
CREATE TRIGGER supplies_audit_update AFTER UPDATE ON event_supplies BEGIN
 INSERT INTO event_supply_audit(id,event_id,supply_id,cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES('supply-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,NEW.cash_box_id,'update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('name',OLD.name,'amountCents',OLD.amount_cents,'source',OLD.source,'cashBoxId',OLD.cash_box_id,'cashBoxName',OLD.cash_box_name,'received',OLD.received),json_object('name',NEW.name,'amountCents',NEW.amount_cents,'source',NEW.source,'cashBoxId',NEW.cash_box_id,'cashBoxName',NEW.cash_box_name,'received',NEW.received)); END;
