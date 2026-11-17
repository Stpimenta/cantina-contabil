-- Preserve approved optional profile fields for imported accounts.
ALTER TABLE local_accounts ADD COLUMN birth_date TEXT;
ALTER TABLE local_accounts ADD COLUMN phone_country TEXT;
ALTER TABLE local_accounts ADD COLUMN phone_number TEXT;
