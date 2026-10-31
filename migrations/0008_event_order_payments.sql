CREATE TABLE event_order_payments (
 order_id TEXT NOT NULL REFERENCES event_orders(id), version INTEGER NOT NULL, method TEXT NOT NULL CHECK(method IN('cash','pix')), amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents)='integer' AND amount_cents BETWEEN 1 AND 9007199254740991), PRIMARY KEY(order_id,version,method)
);
CREATE TRIGGER event_order_payments_insert AFTER INSERT ON event_orders BEGIN
 INSERT INTO event_order_payments(order_id,version,method,amount_cents) SELECT NEW.id,NEW.version,'cash',json_extract(NEW.payload_json,'$.cashCents') WHERE NEW.paid=1 AND json_extract(NEW.payload_json,'$.cashCents')>0;
 INSERT INTO event_order_payments(order_id,version,method,amount_cents) SELECT NEW.id,NEW.version,'pix',json_extract(NEW.payload_json,'$.pixCents') WHERE NEW.paid=1 AND json_extract(NEW.payload_json,'$.pixCents')>0; END;
CREATE TRIGGER event_order_payments_update AFTER UPDATE ON event_orders BEGIN
 INSERT INTO event_order_payments(order_id,version,method,amount_cents) SELECT NEW.id,NEW.version,'cash',json_extract(NEW.payload_json,'$.cashCents') WHERE NEW.paid=1 AND json_extract(NEW.payload_json,'$.cashCents')>0;
 INSERT INTO event_order_payments(order_id,version,method,amount_cents) SELECT NEW.id,NEW.version,'pix',json_extract(NEW.payload_json,'$.pixCents') WHERE NEW.paid=1 AND json_extract(NEW.payload_json,'$.pixCents')>0; END;
