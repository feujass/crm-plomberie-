-- Relance automatique des devis : une seule relance email par devis (timestamp d’envoi).
-- Table réelle du projet : public.quotes (équivalent métier « devis »).
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS relance_envoyee_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN quotes.relance_envoyee_at IS 'Horodatage du premier (et seul) email de relance pour signature ; NULL si aucune relance envoyée.';
