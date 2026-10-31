CREATE TABLE event_order_items (
 order_id TEXT NOT NULL REFERENCES event_orders(id), version INTEGER NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL, icon TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(typeof(price_cents)='integer' AND price_cents BETWEEN 0 AND 9007199254740991), quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity BETWEEN 1 AND 9007199254740991), PRIMARY KEY(order_id,version,product_id)
);
CREATE TRIGGER event_order_items_validate_insert BEFORE INSERT ON event_orders
 WHEN EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.items') j WHERE json_extract(j.value,'$.priceCents') IS NOT (SELECT price_cents FROM event_products WHERE event_id=NEW.event_id AND version=NEW.catalog_version AND id=json_extract(j.value,'$.id')))
 BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;
 CREATE TRIGGER event_order_items_insert AFTER INSERT ON event_orders BEGIN
 INSERT INTO event_order_items(order_id,version,product_id,name,icon,price_cents,quantity) SELECT NEW.id,NEW.version,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.icon'),json_extract(value,'$.priceCents'),json_extract(value,'$.quantity') FROM json_each(NEW.payload_json,'$.items'); END;
CREATE TRIGGER event_order_items_validate_update BEFORE UPDATE ON event_orders
 WHEN EXISTS(SELECT 1 FROM json_each(NEW.payload_json,'$.items') j WHERE json_extract(j.value,'$.priceCents') IS NOT coalesce((SELECT price_cents FROM event_order_items WHERE order_id=OLD.id AND version=OLD.version AND product_id=json_extract(j.value,'$.id')),(SELECT price_cents FROM event_products WHERE event_id=NEW.event_id AND version=NEW.catalog_version AND id=json_extract(j.value,'$.id'))))
 BEGIN SELECT RAISE(ABORT,'EVENT_CATALOG_CHANGED'); END;
 CREATE TRIGGER event_order_items_update AFTER UPDATE ON event_orders BEGIN
 INSERT INTO event_order_items(order_id,version,product_id,name,icon,price_cents,quantity) SELECT NEW.id,NEW.version,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.icon'),json_extract(value,'$.priceCents'),json_extract(value,'$.quantity') FROM json_each(NEW.payload_json,'$.items'); END;
