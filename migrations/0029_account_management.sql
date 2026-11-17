ALTER TABLE local_accounts ADD COLUMN activated_at TEXT;
ALTER TABLE local_accounts ADD COLUMN cash_box_ids_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(cash_box_ids_json) AND json_type(cash_box_ids_json)='array');
ALTER TABLE local_accounts ADD COLUMN changed_by INTEGER;
CREATE TABLE local_account_audit(id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL REFERENCES local_accounts(id), actor_id INTEGER, created_at TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL);
CREATE TRIGGER local_account_scope_guard BEFORE UPDATE OF cash_box_ids_json,role ON local_accounts
BEGIN
 SELECT CASE WHEN NEW.role='admin' AND json_array_length(NEW.cash_box_ids_json)<>0 THEN RAISE(ABORT,'ACCOUNT_SCOPE_INVALID') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.cash_box_ids_json) j LEFT JOIN cash_boxes b ON b.id=j.value AND b.deleted_at IS NULL WHERE j.type<>'text' OR b.id IS NULL) OR json_array_length(NEW.cash_box_ids_json)<>(SELECT count(DISTINCT value) FROM json_each(NEW.cash_box_ids_json)) THEN RAISE(ABORT,'ACCOUNT_SCOPE_INVALID') END;
END;
CREATE TRIGGER local_account_scope_apply AFTER UPDATE OF cash_box_ids_json,role ON local_accounts
BEGIN
 DELETE FROM local_account_cash_boxes WHERE account_id=NEW.id;
 INSERT INTO local_account_cash_boxes(account_id,cash_box_id) SELECT NEW.id,value FROM json_each(NEW.cash_box_ids_json) WHERE NEW.role='operator';
END;
CREATE TRIGGER local_account_audit_update AFTER UPDATE OF version ON local_accounts WHEN NEW.version<>OLD.version
BEGIN
 INSERT INTO local_account_audit(account_id,actor_id,created_at,before_json,after_json) VALUES(NEW.id,NEW.changed_by,NEW.updated_at,json_object('name',OLD.name,'email',OLD.email,'role',OLD.role,'state',OLD.state,'cashBoxIds',json(OLD.cash_box_ids_json),'version',OLD.version),json_object('name',NEW.name,'email',NEW.email,'role',NEW.role,'state',NEW.state,'cashBoxIds',json(NEW.cash_box_ids_json),'version',NEW.version));
END;
CREATE TRIGGER local_account_audit_no_update BEFORE UPDATE ON local_account_audit BEGIN SELECT RAISE(ABORT,'ACCOUNT_AUDIT_IMMUTABLE');END;
CREATE TRIGGER local_account_audit_no_delete BEFORE DELETE ON local_account_audit BEGIN SELECT RAISE(ABORT,'ACCOUNT_AUDIT_IMMUTABLE');END;
DROP TRIGGER account_invitation_activate;
CREATE TRIGGER account_invitation_activate AFTER UPDATE OF consumed_at ON account_invitations WHEN NEW.consumed_at IS NOT NULL AND OLD.consumed_at IS NULL
BEGIN
 UPDATE local_accounts SET state='active',activated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),version=version+1 WHERE id=NEW.account_id AND state='pending' AND auth_subject IS NOT NULL;
 SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'ACCOUNT_INVITATION_INVALID') END;
END;
