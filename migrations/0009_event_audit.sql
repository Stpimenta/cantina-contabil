CREATE TABLE event_audit (
 id TEXT PRIMARY KEY NOT NULL,event_id TEXT NOT NULL REFERENCES events(id),resource_id TEXT NOT NULL,resource_type TEXT NOT NULL CHECK(resource_type IN('event','order')),action TEXT NOT NULL CHECK(action IN('create','update')),actor_id INTEGER NOT NULL,actor_name TEXT NOT NULL,occurred_at TEXT NOT NULL,before_json TEXT,after_json TEXT NOT NULL CHECK(json_valid(after_json))
);
CREATE INDEX event_audit_event ON event_audit(event_id,occurred_at DESC,id DESC);
CREATE TRIGGER events_audit_insert AFTER INSERT ON events BEGIN
 INSERT INTO event_audit(id,event_id,resource_id,resource_type,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('event-'||NEW.id||'-'||NEW.version,NEW.id,NEW.id,'event','create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,NEW.payload_json); END;
CREATE TRIGGER events_audit_update AFTER UPDATE ON events BEGIN
 INSERT INTO event_audit(id,event_id,resource_id,resource_type,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('event-'||NEW.id||'-'||NEW.version,NEW.id,NEW.id,'event','update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,OLD.payload_json,NEW.payload_json); END;
CREATE TRIGGER event_orders_audit_insert AFTER INSERT ON event_orders BEGIN
 INSERT INTO event_audit(id,event_id,resource_id,resource_type,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('order-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,'order','create',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,NULL,NEW.payload_json); END;
CREATE TRIGGER event_orders_audit_update AFTER UPDATE ON event_orders BEGIN
 INSERT INTO event_audit(id,event_id,resource_id,resource_type,action,actor_id,actor_name,occurred_at,before_json,after_json) VALUES('order-'||NEW.id||'-'||NEW.version,NEW.event_id,NEW.id,'order','update',NEW.updated_by,NEW.updated_by_name,NEW.updated_at,OLD.payload_json,NEW.payload_json); END;
