-- Independent identity links. Existing business records and authorship are untouched.
CREATE TABLE local_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_user_id INTEGER UNIQUE CHECK (external_user_id > 0 AND external_user_id <= 2147483647),
  auth_subject TEXT UNIQUE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 1 AND 254),
  email_key TEXT NOT NULL UNIQUE CHECK (email_key = lower(trim(email_key))),
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'active', 'blocked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (state <> 'active' OR auth_subject IS NOT NULL)
);

CREATE TABLE local_account_cash_boxes (
  account_id INTEGER NOT NULL REFERENCES local_accounts(id),
  cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id),
  PRIMARY KEY (account_id, cash_box_id)
);

-- The account's internal sequence yields a negative author ID for invite-only
-- users; imported users keep their positive GestPV ID. Neither link can change.
CREATE TRIGGER local_accounts_identity_immutable
BEFORE UPDATE ON local_accounts
WHEN NEW.id <> OLD.id
  OR NEW.external_user_id IS NOT OLD.external_user_id
  OR (OLD.auth_subject IS NOT NULL AND NEW.auth_subject IS NOT OLD.auth_subject)
BEGIN
  SELECT RAISE(ABORT, 'LOCAL_ACCOUNT_IDENTITY_IMMUTABLE');
END;

CREATE TRIGGER local_accounts_no_delete
BEFORE DELETE ON local_accounts
BEGIN
  SELECT RAISE(ABORT, 'LOCAL_ACCOUNT_DELETE_FORBIDDEN');
END;
