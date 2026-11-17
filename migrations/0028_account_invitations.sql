CREATE TABLE account_invitations (
  id TEXT PRIMARY KEY NOT NULL,
  account_id INTEGER NOT NULL REFERENCES local_accounts(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at),
  created_by INTEGER NOT NULL,
  cancelled_at INTEGER,
  consumed_at INTEGER,
  CHECK(cancelled_at IS NULL OR consumed_at IS NULL)
);
CREATE UNIQUE INDEX account_invitation_pending ON account_invitations(account_id) WHERE cancelled_at IS NULL AND consumed_at IS NULL;
CREATE TABLE account_setup_tickets (
  credential_hash TEXT PRIMARY KEY NOT NULL,
  account_id INTEGER NOT NULL REFERENCES local_accounts(id),
  invitation_id TEXT REFERENCES account_invitations(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('invite','recovery')),
  encrypted_tokens TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE TRIGGER account_invitation_consume_guard BEFORE UPDATE OF consumed_at ON account_invitations
WHEN NEW.consumed_at IS NOT NULL AND (OLD.consumed_at IS NOT NULL OR OLD.cancelled_at IS NOT NULL OR OLD.expires_at <= NEW.consumed_at)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_INVITATION_INVALID'); END;
CREATE TRIGGER account_invitation_activate AFTER UPDATE OF consumed_at ON account_invitations
WHEN NEW.consumed_at IS NOT NULL AND OLD.consumed_at IS NULL
BEGIN
  UPDATE local_accounts SET state='active',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),version=version+1 WHERE id=NEW.account_id AND state='pending' AND auth_subject IS NOT NULL;
  SELECT CASE WHEN changes() <> 1 THEN RAISE(ABORT,'ACCOUNT_INVITATION_INVALID') END;
END;

CREATE TRIGGER account_ticket_consume_guard BEFORE UPDATE OF consumed_at ON account_setup_tickets
WHEN NEW.consumed_at IS NOT NULL
BEGIN
 SELECT CASE WHEN OLD.consumed_at IS NOT NULL OR OLD.expires_at <= NEW.consumed_at THEN RAISE(ABORT,'ACCOUNT_INVITATION_INVALID') END;
 SELECT CASE WHEN NEW.purpose='invite' AND NOT EXISTS(SELECT 1 FROM account_invitations i JOIN local_accounts a ON a.id=i.account_id WHERE i.id=NEW.invitation_id AND i.account_id=NEW.account_id AND i.cancelled_at IS NULL AND i.consumed_at IS NULL AND i.expires_at>NEW.consumed_at AND a.state='pending' AND a.auth_subject IS NOT NULL) THEN RAISE(ABORT,'ACCOUNT_INVITATION_INVALID') END;
 SELECT CASE WHEN NEW.purpose='recovery' AND NOT EXISTS(SELECT 1 FROM local_accounts WHERE id=NEW.account_id AND state='active') THEN RAISE(ABORT,'ACCOUNT_INVITATION_INVALID') END;
END;
CREATE TRIGGER account_ticket_complete AFTER UPDATE OF consumed_at ON account_setup_tickets WHEN NEW.consumed_at IS NOT NULL AND OLD.consumed_at IS NULL
BEGIN
 UPDATE account_invitations SET consumed_at=NEW.consumed_at WHERE id=NEW.invitation_id AND NEW.purpose='invite';
 UPDATE account_sessions SET revoked_at=NEW.consumed_at WHERE account_id=NEW.account_id AND revoked_at IS NULL;
END;
