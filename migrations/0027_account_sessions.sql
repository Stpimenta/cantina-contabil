-- Opaque browser credentials: only hashes and encrypted provider tokens in D1.
CREATE TABLE account_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id INTEGER NOT NULL REFERENCES local_accounts(id),
  credential_hash TEXT NOT NULL UNIQUE,
  encrypted_tokens TEXT NOT NULL,
  provider_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  refresh_lease_until INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  revoked_at INTEGER,
  CHECK(last_active_at >= created_at)
);
CREATE INDEX account_sessions_account ON account_sessions(account_id, revoked_at);
