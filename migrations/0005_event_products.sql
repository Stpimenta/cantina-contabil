CREATE TABLE event_products (
 event_id TEXT NOT NULL REFERENCES events(id), version INTEGER NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100), icon TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(typeof(price_cents)='integer' AND price_cents BETWEEN 0 AND 9007199254740991), PRIMARY KEY(event_id,version,id)
);
CREATE TRIGGER event_products_create AFTER INSERT ON events BEGIN
 INSERT INTO event_products(event_id,version,id,name,icon,price_cents) SELECT NEW.id,NEW.version,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.icon'),json_extract(value,'$.priceCents') FROM json_each(NEW.payload_json,'$.products'); END;
CREATE TRIGGER event_products_update AFTER UPDATE ON events BEGIN
 INSERT INTO event_products(event_id,version,id,name,icon,price_cents) SELECT NEW.id,NEW.version,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.icon'),json_extract(value,'$.priceCents') FROM json_each(NEW.payload_json,'$.products'); END;
