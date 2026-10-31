CREATE TABLE cash_boxes (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 name_key TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 500),
 created_at TEXT NOT NULL,
 created_by INTEGER NOT NULL,
 created_by_name TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 updated_by INTEGER NOT NULL,
 updated_by_name TEXT NOT NULL,
 deleted_at TEXT,
 deleted_by INTEGER,
 deleted_by_name TEXT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
 CHECK((deleted_at IS NULL AND deleted_by IS NULL AND deleted_by_name IS NULL)
    OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND deleted_by_name IS NOT NULL))
);
CREATE UNIQUE INDEX cash_boxes_active_name ON cash_boxes(name_key) WHERE deleted_at IS NULL;
CREATE INDEX cash_boxes_active_created ON cash_boxes(created_at DESC, id DESC) WHERE deleted_at IS NULL;
