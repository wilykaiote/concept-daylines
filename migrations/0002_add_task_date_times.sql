-- Migration number: 0002
ALTER TABLE tasks ADD COLUMN date TEXT;
ALTER TABLE tasks ADD COLUMN starts_at TEXT;
ALTER TABLE tasks ADD COLUMN due_at TEXT;
