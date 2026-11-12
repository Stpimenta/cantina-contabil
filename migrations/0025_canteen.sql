-- New mode; old rows remain Standard/Deliveries. Preserve versions and snapshots.
ALTER TABLE events ADD COLUMN canteen_enabled INTEGER NOT NULL DEFAULT 0 CHECK(canteen_enabled IN(0,1));
CREATE TRIGGER events_mode_exclusive_insert BEFORE INSERT ON events WHEN NEW.delivery_enabled+NEW.canteen_enabled>1 BEGIN SELECT RAISE(ABORT,'EVENT_MODALITY_LOCKED'); END;
CREATE TRIGGER events_mode_locked BEFORE UPDATE OF delivery_enabled,canteen_enabled ON events
WHEN NEW.delivery_enabled+NEW.canteen_enabled>1 OR ((NEW.canteen_enabled!=OLD.canteen_enabled) AND EXISTS(SELECT 1 FROM event_orders WHERE event_id=NEW.id))
BEGIN SELECT RAISE(ABORT,'EVENT_MODALITY_LOCKED'); END;

CREATE TABLE canteen_access (
 id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL REFERENCES events(id), name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 created_by INTEGER NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT NOT NULL,
 expires_at INTEGER NOT NULL, revoked_at INTEGER, link_hash TEXT NOT NULL UNIQUE,
 session_hash TEXT UNIQUE, revocation_operation TEXT, activated_at INTEGER
);
CREATE INDEX canteen_access_event ON canteen_access(event_id,created_at,id);
CREATE TABLE canteen_publications (
 id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL REFERENCES events(id), deadline INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN('armed','committed','cancelled','published')),
 order_id TEXT, version INTEGER, kind TEXT NOT NULL DEFAULT 'order'
);
CREATE INDEX canteen_publications_pending ON canteen_publications(event_id,state,deadline);
-- A durable alarm is armed BEFORE an intent is inserted. The deadline fences late writes.
CREATE TRIGGER canteen_order_insert_guard BEFORE INSERT ON event_orders
WHEN (SELECT canteen_enabled FROM events WHERE id=NEW.event_id)=1 AND NOT EXISTS(
 SELECT 1 FROM canteen_publications WHERE id=NEW.last_operation AND event_id=NEW.event_id AND state='armed' AND deadline>unixepoch())
BEGIN SELECT RAISE(ABORT,'CANTEEN_PUBLICATION_REQUIRED'); END;
CREATE TRIGGER canteen_order_update_guard BEFORE UPDATE ON event_orders
WHEN (SELECT canteen_enabled FROM events WHERE id=NEW.event_id)=1 AND NOT EXISTS(
 SELECT 1 FROM canteen_publications WHERE id=NEW.last_operation AND event_id=NEW.event_id AND state='armed' AND deadline>unixepoch())
BEGIN SELECT RAISE(ABORT,'CANTEEN_PUBLICATION_REQUIRED'); END;
CREATE TRIGGER canteen_order_insert_publish AFTER INSERT ON event_orders WHEN (SELECT canteen_enabled FROM events WHERE id=NEW.event_id)=1
BEGIN UPDATE canteen_publications SET state='committed',order_id=NEW.id,version=NEW.version WHERE id=NEW.last_operation; END;
CREATE TRIGGER canteen_order_update_publish AFTER UPDATE ON event_orders WHEN (SELECT canteen_enabled FROM events WHERE id=NEW.event_id)=1
BEGIN UPDATE canteen_publications SET state='committed',order_id=NEW.id,version=NEW.version WHERE id=NEW.last_operation; END;
-- Recheck the temporary actor at commit, including a concurrent revoke/expiry.
CREATE TRIGGER canteen_actor_guard BEFORE UPDATE ON event_orders WHEN json_extract(NEW.payload_json,'$.updatedActor.kind')='access' AND NOT EXISTS(
 SELECT 1 FROM canteen_access WHERE id=json_extract(NEW.payload_json,'$.updatedActor.id') AND event_id=NEW.event_id AND revoked_at IS NULL AND expires_at>unixepoch() AND session_hash IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'TEMP_ACCESS_ENDED'); END;
-- Audit preserves the access and its creator separately; numeric zero is the legacy non-user discriminator.
ALTER TABLE event_audit ADD COLUMN actor_access_id TEXT;
ALTER TABLE event_audit ADD COLUMN access_creator_id INTEGER;
ALTER TABLE event_audit ADD COLUMN access_creator_name TEXT;
CREATE TRIGGER canteen_actor_audit AFTER INSERT ON event_audit WHEN json_extract(NEW.after_json,'$.updatedActor.kind')='access'
BEGIN UPDATE event_audit SET actor_access_id=json_extract(NEW.after_json,'$.updatedActor.id'),access_creator_id=json_extract(NEW.after_json,'$.updatedActor.createdBy'),access_creator_name=json_extract(NEW.after_json,'$.updatedActor.createdByName') WHERE id=NEW.id; END;

CREATE TRIGGER canteen_access_revoke_guard BEFORE UPDATE OF revoked_at ON canteen_access
WHEN OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM canteen_publications WHERE id=NEW.revocation_operation AND event_id=NEW.event_id AND state='armed' AND deadline>unixepoch())
BEGIN SELECT RAISE(ABORT,'CANTEEN_PUBLICATION_REQUIRED'); END;
CREATE TRIGGER canteen_access_revoke_publish AFTER UPDATE OF revoked_at ON canteen_access
WHEN OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL
BEGIN UPDATE canteen_publications SET state='committed',kind='access',order_id=NEW.id,version=1 WHERE id=NEW.revocation_operation; END;
