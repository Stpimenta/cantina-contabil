CREATE TABLE donations (
 id TEXT PRIMARY KEY NOT NULL,
 cash_box_id TEXT NOT NULL REFERENCES cash_boxes(id),
 amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents)='integer' AND amount_cents > 0 AND amount_cents <= 9007199254740991),
 donated_on TEXT NOT NULL CHECK(length(donated_on) = 10),
 donor_name TEXT NOT NULL DEFAULT '' CHECK(length(donor_name) <= 100),
 note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 500),
 created_at TEXT NOT NULL,
 created_by INTEGER NOT NULL,
 created_by_name TEXT NOT NULL,
 deleted_at TEXT,
 deleted_by INTEGER,
 deleted_by_name TEXT,
 CHECK((deleted_at IS NULL AND deleted_by IS NULL AND deleted_by_name IS NULL)
 OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND deleted_by_name IS NOT NULL))
);
CREATE INDEX donations_box_date ON donations(cash_box_id, donated_on DESC, created_at DESC, id DESC);
CREATE INDEX donations_date ON donations(donated_on DESC, created_at DESC, id DESC);
CREATE TRIGGER donations_active_box BEFORE INSERT ON donations
WHEN NOT EXISTS(SELECT 1 FROM cash_boxes WHERE id = NEW.cash_box_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'DONATION_BOX_UNAVAILABLE'); END;
CREATE TRIGGER cash_boxes_preserve_donations BEFORE UPDATE OF deleted_at ON cash_boxes
WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM donations WHERE cash_box_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'CASH_BOX_HAS_DONATIONS'); END;

CREATE TRIGGER donations_balance_precision BEFORE INSERT ON donations
WHEN coalesce((SELECT sum(amount_cents) FROM donations WHERE cash_box_id=NEW.cash_box_id AND deleted_at IS NULL),0) > 9007199254740991 - NEW.amount_cents
BEGIN SELECT RAISE(ABORT, 'DONATION_BALANCE_LIMIT'); END;
