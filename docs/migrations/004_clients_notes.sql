-- Notes libres sur la fiche client + horodatage de dernière modification.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMPTZ NULL;
