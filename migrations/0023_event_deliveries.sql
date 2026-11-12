-- Preserve all existing payloads, versions and audit snapshots.
ALTER TABLE events ADD COLUMN delivery_enabled INTEGER NOT NULL DEFAULT 0 CHECK(delivery_enabled IN (0,1));

CREATE TRIGGER events_delivery_locked BEFORE UPDATE OF delivery_enabled ON events
WHEN NEW.delivery_enabled=0 AND OLD.delivery_enabled=1 AND EXISTS (
  SELECT 1 FROM event_orders WHERE event_id=NEW.id AND (
    json_extract(payload_json,'$.fulfillmentMode') IS NOT NULL
    OR json_extract(payload_json,'$.address') IS NOT NULL
    OR coalesce(json_extract(payload_json,'$.contactPhone'),'')!=''
    OR coalesce(json_extract(payload_json,'$.fulfilled'),0)!=0
  )
)
BEGIN SELECT RAISE(ABORT,'EVENT_DELIVERY_LOCKED'); END;

CREATE TRIGGER event_orders_delivery_insert BEFORE INSERT ON event_orders
WHEN (
  (SELECT delivery_enabled FROM events WHERE id=NEW.event_id)=1
  AND coalesce(json_extract(NEW.payload_json,'$.fulfillmentMode'),'') NOT IN ('delivery','pickup')
) OR (
  (SELECT delivery_enabled FROM events WHERE id=NEW.event_id)=0 AND (
    json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT NULL
    OR json_extract(NEW.payload_json,'$.address') IS NOT NULL
    OR coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')!=''
    OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0
  )
)
BEGIN SELECT RAISE(ABORT,'EVENT_DELIVERY_DISABLED'); END;

CREATE TRIGGER event_orders_delivery_update BEFORE UPDATE ON event_orders
WHEN NEW.deleted_at IS NULL AND ((
  (SELECT delivery_enabled FROM events WHERE id=NEW.event_id)=1
  AND coalesce(json_extract(NEW.payload_json,'$.fulfillmentMode'),'') NOT IN ('delivery','pickup')
) OR (
  (SELECT delivery_enabled FROM events WHERE id=NEW.event_id)=0 AND (
    json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT NULL
    OR json_extract(NEW.payload_json,'$.address') IS NOT NULL
    OR coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')!=''
    OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0
  )
))
BEGIN SELECT RAISE(ABORT,'EVENT_DELIVERY_DISABLED'); END;
