-- Preserve the account identity and historical authorship on removal/reinvitation.
ALTER TABLE local_accounts ADD COLUMN deleted_at TEXT;
ALTER TABLE local_accounts ADD COLUMN requires_activation_name INTEGER NOT NULL DEFAULT 0 CHECK(requires_activation_name IN (0,1));
CREATE TRIGGER local_account_deleted_guard BEFORE UPDATE ON local_accounts
WHEN NEW.deleted_at IS NOT NULL AND NEW.state <> 'blocked'
BEGIN SELECT RAISE(ABORT,'ACCOUNT_SCOPE_INVALID'); END;
CREATE TRIGGER local_account_delete_access AFTER UPDATE OF deleted_at ON local_accounts
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
 UPDATE account_sessions SET revoked_at=CAST(strftime('%s','now') AS INTEGER) WHERE account_id=NEW.id AND revoked_at IS NULL;
 UPDATE account_invitations SET cancelled_at=CAST(strftime('%s','now') AS INTEGER) WHERE account_id=NEW.id AND cancelled_at IS NULL AND consumed_at IS NULL;
 -- Expiring obsolete proof preserves it without activating its invitation.
 UPDATE account_setup_tickets SET expires_at=0 WHERE account_id=NEW.id AND consumed_at IS NULL;
END;
DROP TRIGGER local_account_audit_update;
CREATE TRIGGER local_account_audit_update AFTER UPDATE OF version ON local_accounts WHEN NEW.version<>OLD.version
BEGIN
 INSERT INTO local_account_audit(account_id,actor_id,created_at,before_json,after_json) VALUES(NEW.id,NEW.changed_by,NEW.updated_at,
 json_object('name',OLD.name,'email',OLD.email,'role',coalesce(OLD.access_role,OLD.role),'state',OLD.state,'cashBoxIds',json(OLD.cash_box_ids_json),'access',json(OLD.access_json),'version',OLD.version,'deletedAt',OLD.deleted_at),
 json_object('name',NEW.name,'email',NEW.email,'role',NEW.access_role,'state',NEW.state,'cashBoxIds',json(NEW.cash_box_ids_json),'access',json(NEW.access_json),'version',NEW.version,'deletedAt',NEW.deleted_at));
END;
