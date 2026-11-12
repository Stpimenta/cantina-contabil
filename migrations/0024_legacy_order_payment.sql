-- A pending legacy order may be paid without filling delivery data retroactively.
-- Full order editing still requires the modality in its use case.
DROP TRIGGER event_orders_delivery_update;
CREATE TRIGGER event_orders_delivery_update BEFORE UPDATE ON event_orders
WHEN NEW.deleted_at IS NULL AND ((
  (SELECT delivery_enabled FROM events WHERE id=NEW.event_id)=1
  AND coalesce(json_extract(NEW.payload_json,'$.fulfillmentMode'),'') NOT IN ('delivery','pickup')
  AND NOT (
    json_extract(OLD.payload_json,'$.fulfillmentMode') IS NULL
    AND json_extract(NEW.payload_json,'$.fulfillmentMode') IS NULL
    AND json_extract(NEW.payload_json,'$.address') IS json_extract(OLD.payload_json,'$.address')
    AND coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')=coalesce(json_extract(OLD.payload_json,'$.contactPhone'),'')
    AND coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)=coalesce(json_extract(OLD.payload_json,'$.fulfilled'),0)
  )
) OR (
  (SELECT delivery_enabled FROM events WHERE id=NEW.event_id)=0 AND (
    json_extract(NEW.payload_json,'$.fulfillmentMode') IS NOT NULL
    OR json_extract(NEW.payload_json,'$.address') IS NOT NULL
    OR coalesce(json_extract(NEW.payload_json,'$.contactPhone'),'')!=''
    OR coalesce(json_extract(NEW.payload_json,'$.fulfilled'),0)!=0
  )
))
BEGIN SELECT RAISE(ABORT,'EVENT_DELIVERY_DISABLED'); END;
