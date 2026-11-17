-- Preserve identity IDs, sessions, grants and audit history.
ALTER TABLE local_accounts ADD COLUMN access_role TEXT CHECK(access_role IN ('admin','finance','operator'));
ALTER TABLE local_accounts ADD COLUMN access_json TEXT NOT NULL DEFAULT '{"cashBoxWriteIds":[],"eventIds":[],"eventWriteIds":[]}' CHECK(json_valid(access_json));
UPDATE local_accounts SET access_role=CASE role WHEN 'admin' THEN 'admin' ELSE 'finance' END,
 access_json=json_object('cashBoxWriteIds',json(cash_box_ids_json),'eventIds',json('[]'),'eventWriteIds',json('[]'));
CREATE TRIGGER local_account_access_guard BEFORE UPDATE OF role,access_role,access_json,cash_box_ids_json ON local_accounts
BEGIN
 SELECT CASE WHEN NEW.access_role IS NULL OR (NEW.access_role='admin')<>(NEW.role='admin')
 OR json_type(NEW.access_json,'$.cashBoxWriteIds') IS NOT 'array'
 OR json_type(NEW.access_json,'$.eventIds') IS NOT 'array'
 OR json_type(NEW.access_json,'$.eventWriteIds') IS NOT 'array'
 THEN RAISE(ABORT,'ACCOUNT_SCOPE_INVALID') END;
 SELECT CASE WHEN (NEW.access_role<>'finance' AND json_array_length(NEW.cash_box_ids_json)<>0)
 OR (NEW.access_role<>'operator' AND json_array_length(NEW.access_json,'$.eventIds')<>0)
 OR EXISTS(SELECT 1 FROM json_each(NEW.access_json,'$.cashBoxWriteIds') w WHERE w.type<>'text' OR w.value NOT IN(SELECT value FROM json_each(NEW.cash_box_ids_json)))
 OR EXISTS(SELECT 1 FROM json_each(NEW.access_json,'$.eventWriteIds') w WHERE w.type<>'text' OR w.value NOT IN(SELECT value FROM json_each(NEW.access_json,'$.eventIds')))
 OR EXISTS(SELECT 1 FROM json_each(NEW.access_json,'$.eventIds') j LEFT JOIN events e ON e.id=j.value AND e.deleted_at IS NULL WHERE j.type<>'text' OR e.id IS NULL)
 OR json_array_length(NEW.access_json,'$.eventIds')<>(SELECT count(DISTINCT value) FROM json_each(NEW.access_json,'$.eventIds'))
 OR json_array_length(NEW.access_json,'$.cashBoxWriteIds')<>(SELECT count(DISTINCT value) FROM json_each(NEW.access_json,'$.cashBoxWriteIds'))
 OR json_array_length(NEW.access_json,'$.eventWriteIds')<>(SELECT count(DISTINCT value) FROM json_each(NEW.access_json,'$.eventWriteIds'))
 THEN RAISE(ABORT,'ACCOUNT_SCOPE_INVALID') END;
END;
DROP TRIGGER local_account_audit_update;
CREATE TRIGGER local_account_audit_update AFTER UPDATE OF version ON local_accounts WHEN NEW.version<>OLD.version
BEGIN
 INSERT INTO local_account_audit(account_id,actor_id,created_at,before_json,after_json) VALUES(NEW.id,NEW.changed_by,NEW.updated_at,
 json_object('name',OLD.name,'email',OLD.email,'role',coalesce(OLD.access_role,OLD.role),'state',OLD.state,'cashBoxIds',json(OLD.cash_box_ids_json),'access',json(OLD.access_json),'version',OLD.version),
 json_object('name',NEW.name,'email',NEW.email,'role',NEW.access_role,'state',NEW.state,'cashBoxIds',json(NEW.cash_box_ids_json),'access',json(NEW.access_json),'version',NEW.version));
END;
