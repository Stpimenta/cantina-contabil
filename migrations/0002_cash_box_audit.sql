CREATE TABLE cash_box_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id),
 action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
 actor_id INTEGER NOT NULL,
 actor_name TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 before_json TEXT,
 after_json TEXT NOT NULL
);
CREATE INDEX cash_box_audit_box ON cash_box_audit(cash_box_id, id DESC);

CREATE TRIGGER cash_box_audit_create AFTER INSERT ON cash_boxes BEGIN
 INSERT INTO cash_box_audit(cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES(NEW.id,'create',NEW.created_by,NEW.created_by_name,NEW.created_at,NULL,json_object('name', NEW.name, 'description', NEW.description, 'version', NEW.version, 'deletedAt', NEW.deleted_at));
END;
CREATE TRIGGER cash_box_audit_update AFTER UPDATE ON cash_boxes BEGIN
 INSERT INTO cash_box_audit(cash_box_id,action,actor_id,actor_name,occurred_at,before_json,after_json)
 VALUES(NEW.id,CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'delete' ELSE 'update' END,
 NEW.updated_by,NEW.updated_by_name,NEW.updated_at,json_object('name', OLD.name, 'description', OLD.description, 'version', OLD.version, 'deletedAt', OLD.deleted_at),json_object('name', NEW.name, 'description', NEW.description, 'version', NEW.version, 'deletedAt', NEW.deleted_at));
END;
