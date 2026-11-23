-- Delivery planning only. Preserve existing orders, financial snapshots and stock.
CREATE TABLE delivery_drivers (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100), phone TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>0), updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL,
 last_operation TEXT NOT NULL, fingerprint TEXT NOT NULL
);
CREATE TABLE delivery_settings (
 event_id TEXT PRIMARY KEY NOT NULL REFERENCES events(id), payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 version INTEGER NOT NULL CHECK(version>0), updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL,
 last_operation TEXT NOT NULL, fingerprint TEXT NOT NULL
);
CREATE TABLE delivery_routes (
 id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL REFERENCES events(id), driver_id TEXT NOT NULL REFERENCES delivery_drivers(id),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100), payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 started_at TEXT, cancelled INTEGER NOT NULL DEFAULT 0 CHECK(cancelled IN(0,1)),
 version INTEGER NOT NULL CHECK(version>0), updated_at TEXT NOT NULL, updated_by INTEGER NOT NULL, updated_by_name TEXT NOT NULL,
 last_operation TEXT NOT NULL, fingerprint TEXT NOT NULL
);
CREATE INDEX delivery_routes_event ON delivery_routes(event_id,cancelled,updated_at,id);
CREATE INDEX delivery_routes_driver ON delivery_routes(event_id,driver_id,cancelled,id);
CREATE TABLE delivery_stops (
 order_id TEXT PRIMARY KEY NOT NULL REFERENCES event_orders(id), route_id TEXT NOT NULL REFERENCES delivery_routes(id),
 position INTEGER NOT NULL CHECK(position>=0), UNIQUE(route_id,position)
);
CREATE INDEX delivery_stops_route ON delivery_stops(route_id,position);
CREATE TABLE delivery_access (
 id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL REFERENCES events(id), driver_id TEXT NOT NULL REFERENCES delivery_drivers(id),
 name TEXT NOT NULL, created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT NOT NULL,
 expires_at INTEGER NOT NULL, revoked_at INTEGER, activated_at INTEGER, link_hash TEXT NOT NULL UNIQUE, session_hash TEXT UNIQUE
);
CREATE INDEX delivery_access_event ON delivery_access(event_id,created_at,id);
CREATE TABLE delivery_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, event_id TEXT,
 occurred_at TEXT NOT NULL, actor_id INTEGER NOT NULL, actor_name TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL
);
-- All management writes are optimistic. A stale second write aborts a multi-route move.
CREATE TRIGGER delivery_drivers_version BEFORE UPDATE ON delivery_drivers
 WHEN NEW.id!=OLD.id OR NEW.version!=OLD.version+1
 BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_drivers_preserve BEFORE DELETE ON delivery_drivers BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_settings_version BEFORE UPDATE ON delivery_settings
 WHEN NEW.event_id!=OLD.event_id OR NEW.version!=OLD.version+1
 BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_settings_preserve BEFORE DELETE ON delivery_settings BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_routes_version BEFORE UPDATE ON delivery_routes
 WHEN NEW.id!=OLD.id OR NEW.version!=OLD.version+1
 BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_routes_preserve BEFORE DELETE ON delivery_routes BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_settings_insert_guard BEFORE INSERT ON delivery_settings
WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL AND kind='event' AND delivery_enabled=1)
 OR EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.driverIds') d WHERE NOT EXISTS(SELECT 1 FROM delivery_drivers WHERE id=d.value))
BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_settings_update_guard BEFORE UPDATE ON delivery_settings
WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL AND kind='event' AND delivery_enabled=1)
 OR EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.driverIds') d WHERE NOT EXISTS(SELECT 1 FROM delivery_drivers WHERE id=d.value))
 OR EXISTS(SELECT 1 FROM delivery_routes r JOIN delivery_stops s ON s.route_id=r.id JOIN event_orders o ON o.id=s.order_id
 WHERE r.event_id=NEW.event_id AND r.cancelled=0 AND o.deleted_at IS NULL AND coalesce(json_extract(o.payload_json,'$.fulfilled'),0)=0
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.driverIds') d WHERE d.value=r.driver_id))
BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_route_insert_guard BEFORE INSERT ON delivery_routes
WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL AND kind='event' AND delivery_enabled=1)
 OR NOT EXISTS(SELECT 1 FROM delivery_settings c,json_each(c.payload_json,'$.driverIds') d WHERE c.event_id=NEW.event_id AND d.value=NEW.driver_id)
 OR (NEW.cancelled=0 AND (json_array_length(NEW.payload_json,'$.orderIds')<1 OR EXISTS(
   SELECT 1 FROM json_each(NEW.payload_json,'$.orderIds') j WHERE NOT EXISTS(
    SELECT 1 FROM event_orders o WHERE o.id=j.value AND o.event_id=NEW.event_id AND o.deleted_at IS NULL
     AND json_extract(o.payload_json,'$.fulfillmentMode')='delivery'
     AND (coalesce(json_extract(o.payload_json,'$.fulfilled'),0)=0 OR EXISTS(SELECT 1 FROM delivery_stops s WHERE s.route_id=NEW.id AND s.order_id=o.id))
   ))))
BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_route_update_guard BEFORE UPDATE ON delivery_routes
WHEN NOT EXISTS(SELECT 1 FROM events WHERE id=NEW.event_id AND deleted_at IS NULL AND kind='event' AND delivery_enabled=1)
 OR NOT EXISTS(SELECT 1 FROM delivery_settings c,json_each(c.payload_json,'$.driverIds') d WHERE c.event_id=NEW.event_id AND d.value=NEW.driver_id)
 OR (NEW.cancelled=0 AND (json_array_length(NEW.payload_json,'$.orderIds')<1 OR EXISTS(
   SELECT 1 FROM json_each(NEW.payload_json,'$.orderIds') j WHERE NOT EXISTS(
    SELECT 1 FROM event_orders o WHERE o.id=j.value AND o.event_id=NEW.event_id AND o.deleted_at IS NULL
     AND json_extract(o.payload_json,'$.fulfillmentMode')='delivery'
     AND (coalesce(json_extract(o.payload_json,'$.fulfilled'),0)=0 OR EXISTS(SELECT 1 FROM delivery_stops s WHERE s.route_id=NEW.id AND s.order_id=o.id))
   ))))
BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_route_preserve_completed BEFORE UPDATE ON delivery_routes
WHEN NEW.event_id!=OLD.event_id OR OLD.cancelled=1 OR (OLD.started_at IS NOT NULL AND NEW.started_at IS NOT OLD.started_at)
 OR EXISTS(SELECT 1 FROM delivery_stops s JOIN event_orders o ON o.id=s.order_id
 WHERE s.route_id=OLD.id AND o.deleted_at IS NULL AND coalesce(json_extract(o.payload_json,'$.fulfilled'),0)=1
 AND (NEW.cancelled=1 OR NOT EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.orderIds') j WHERE j.value=o.id)))
BEGIN SELECT RAISE(ABORT,'DELIVERY_CHANGED'); END;
CREATE TRIGGER delivery_stop_insert_guard BEFORE INSERT ON delivery_stops
WHEN EXISTS(SELECT 1 FROM delivery_stops WHERE order_id=NEW.order_id)
BEGIN SELECT RAISE(ABORT,'DELIVERY_ORDER_ASSIGNED'); END;
CREATE TRIGGER delivery_route_insert_stops AFTER INSERT ON delivery_routes WHEN NEW.cancelled=0
BEGIN INSERT INTO delivery_stops(order_id,route_id,position) SELECT value,NEW.id,CAST(key AS INTEGER) FROM json_each(NEW.payload_json,'$.orderIds'); END;
CREATE TRIGGER delivery_route_update_stops AFTER UPDATE ON delivery_routes
BEGIN
 DELETE FROM delivery_stops WHERE route_id=NEW.id;
 INSERT INTO delivery_stops(order_id,route_id,position) SELECT value,NEW.id,CAST(key AS INTEGER) FROM json_each(NEW.payload_json,'$.orderIds') WHERE NEW.cancelled=0;
END;
-- A routed order cannot silently change to pickup or be deleted. Remove it from its route first.
CREATE TRIGGER delivery_order_assignment_guard BEFORE UPDATE ON event_orders
WHEN EXISTS(SELECT 1 FROM delivery_stops WHERE order_id=OLD.id)
 AND (NEW.event_id!=OLD.event_id OR NEW.deleted_at IS NOT NULL OR json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT 'delivery')
BEGIN SELECT RAISE(ABORT,'DELIVERY_ORDER_ASSIGNED'); END;
-- Temporary credentials are checked again inside the same order transaction.
CREATE TRIGGER delivery_actor_guard BEFORE UPDATE ON event_orders
WHEN json_extract(NEW.payload_json,'$.updatedActor.kind')='delivery'
 AND (NOT EXISTS(
 SELECT 1 FROM delivery_access a JOIN delivery_routes r ON r.driver_id=a.driver_id AND r.event_id=a.event_id
 JOIN delivery_stops s ON s.route_id=r.id AND s.order_id=NEW.id
 WHERE a.id=json_extract(NEW.payload_json,'$.updatedActor.id') AND a.event_id=NEW.event_id AND a.revoked_at IS NULL
 AND a.expires_at>unixepoch() AND a.session_hash IS NOT NULL AND r.cancelled=0
 AND EXISTS(SELECT 1 FROM delivery_settings c,json_each(c.payload_json,'$.driverIds') d WHERE c.event_id=a.event_id AND d.value=a.driver_id))
 OR NEW.customer_name!=OLD.customer_name OR NEW.note!=OLD.note OR NEW.total_cents!=OLD.total_cents OR NEW.paid!=OLD.paid
 OR NEW.deleted_at IS NOT OLD.deleted_at OR json_remove(NEW.payload_json,'$.fulfilled','$.updatedActor')!=json_remove(OLD.payload_json,'$.fulfilled','$.updatedActor'))
BEGIN SELECT RAISE(ABORT,'TEMP_ACCESS_ENDED'); END;
CREATE TRIGGER delivery_actor_audit AFTER INSERT ON event_audit WHEN json_extract(NEW.after_json,'$.updatedActor.kind')='delivery'
BEGIN UPDATE event_audit SET actor_access_id=json_extract(NEW.after_json,'$.updatedActor.id'),access_creator_id=json_extract(NEW.after_json,'$.updatedActor.createdBy'),access_creator_name=json_extract(NEW.after_json,'$.updatedActor.createdByName') WHERE id=NEW.id; END;
CREATE TRIGGER delivery_drivers_audit_insert AFTER INSERT ON delivery_drivers
BEGIN INSERT INTO delivery_audit(entity_type,entity_id,event_id,occurred_at,actor_id,actor_name,before_json,after_json)
VALUES('driver',NEW.id,NULL,NEW.updated_at,NEW.updated_by,NEW.updated_by_name,NULL,json_object('id',NEW.id,'name',NEW.name,'phone',NEW.phone,'version',NEW.version,'updated_at',NEW.updated_at,'updated_by',NEW.updated_by,'updated_by_name',NEW.updated_by_name)); END;
CREATE TRIGGER delivery_drivers_audit_update AFTER UPDATE ON delivery_drivers
BEGIN INSERT INTO delivery_audit(entity_type,entity_id,event_id,occurred_at,actor_id,actor_name,before_json,after_json)
VALUES('driver',NEW.id,NULL,NEW.updated_at,NEW.updated_by,NEW.updated_by_name,json_object('id',OLD.id,'name',OLD.name,'phone',OLD.phone,'version',OLD.version,'updated_at',OLD.updated_at,'updated_by',OLD.updated_by,'updated_by_name',OLD.updated_by_name),json_object('id',NEW.id,'name',NEW.name,'phone',NEW.phone,'version',NEW.version,'updated_at',NEW.updated_at,'updated_by',NEW.updated_by,'updated_by_name',NEW.updated_by_name)); END;
CREATE TRIGGER delivery_settings_audit_insert AFTER INSERT ON delivery_settings
BEGIN INSERT INTO delivery_audit(entity_type,entity_id,event_id,occurred_at,actor_id,actor_name,before_json,after_json)
VALUES('settings',NEW.event_id,NEW.event_id,NEW.updated_at,NEW.updated_by,NEW.updated_by_name,NULL,json_object('event_id',NEW.event_id,'payload_json',NEW.payload_json,'version',NEW.version,'updated_at',NEW.updated_at,'updated_by',NEW.updated_by,'updated_by_name',NEW.updated_by_name)); END;
CREATE TRIGGER delivery_settings_audit_update AFTER UPDATE ON delivery_settings
BEGIN INSERT INTO delivery_audit(entity_type,entity_id,event_id,occurred_at,actor_id,actor_name,before_json,after_json)
VALUES('settings',NEW.event_id,NEW.event_id,NEW.updated_at,NEW.updated_by,NEW.updated_by_name,json_object('event_id',OLD.event_id,'payload_json',OLD.payload_json,'version',OLD.version,'updated_at',OLD.updated_at,'updated_by',OLD.updated_by,'updated_by_name',OLD.updated_by_name),json_object('event_id',NEW.event_id,'payload_json',NEW.payload_json,'version',NEW.version,'updated_at',NEW.updated_at,'updated_by',NEW.updated_by,'updated_by_name',NEW.updated_by_name)); END;
CREATE TRIGGER delivery_routes_audit_insert AFTER INSERT ON delivery_routes
BEGIN INSERT INTO delivery_audit(entity_type,entity_id,event_id,occurred_at,actor_id,actor_name,before_json,after_json)
VALUES('route',NEW.id,NEW.event_id,NEW.updated_at,NEW.updated_by,NEW.updated_by_name,NULL,json_object('id',NEW.id,'event_id',NEW.event_id,'driver_id',NEW.driver_id,'name',NEW.name,'payload_json',NEW.payload_json,'started_at',NEW.started_at,'cancelled',NEW.cancelled,'version',NEW.version,'updated_at',NEW.updated_at,'updated_by',NEW.updated_by,'updated_by_name',NEW.updated_by_name)); END;
CREATE TRIGGER delivery_routes_audit_update AFTER UPDATE ON delivery_routes
BEGIN INSERT INTO delivery_audit(entity_type,entity_id,event_id,occurred_at,actor_id,actor_name,before_json,after_json)
VALUES('route',NEW.id,NEW.event_id,NEW.updated_at,NEW.updated_by,NEW.updated_by_name,json_object('id',OLD.id,'event_id',OLD.event_id,'driver_id',OLD.driver_id,'name',OLD.name,'payload_json',OLD.payload_json,'started_at',OLD.started_at,'cancelled',OLD.cancelled,'version',OLD.version,'updated_at',OLD.updated_at,'updated_by',OLD.updated_by,'updated_by_name',OLD.updated_by_name),json_object('id',NEW.id,'event_id',NEW.event_id,'driver_id',NEW.driver_id,'name',NEW.name,'payload_json',NEW.payload_json,'started_at',NEW.started_at,'cancelled',NEW.cancelled,'version',NEW.version,'updated_at',NEW.updated_at,'updated_by',NEW.updated_by,'updated_by_name',NEW.updated_by_name)); END;
