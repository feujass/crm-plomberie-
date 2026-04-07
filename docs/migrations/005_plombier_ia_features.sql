-- Automatisation plombier : RDV, comptes-rendus, commandes matériaux, garanties & SAV.
-- À exécuter dans l’éditeur SQL Supabase après les migrations précédentes.

CREATE TABLE IF NOT EXISTS booking_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'manuel',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_email TEXT,
  problem_type TEXT NOT NULL DEFAULT '',
  problem_detail TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT 'normal',
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nouveau',
  ai_suggested_slots JSONB NOT NULL DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intervention_reports (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  transcript TEXT NOT NULL DEFAULT '',
  report_body TEXT NOT NULL DEFAULT '',
  photo_urls JSONB NOT NULL DEFAULT '[]',
  client_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_id BIGINT REFERENCES quotes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  lines JSONB NOT NULL DEFAULT '[]',
  supplier_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'brouillon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warranties (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  work_summary TEXT NOT NULL DEFAULT '',
  warranty_months INTEGER NOT NULL DEFAULT 24,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  certificate_body TEXT NOT NULL DEFAULT '',
  reminder_30d_sent_at TIMESTAMPTZ,
  reminder_7d_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sav_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  warranty_id BIGINT REFERENCES warranties(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ouvert',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_user ON booking_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_intervention_reports_user ON intervention_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_material_orders_user ON material_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_warranties_user ON warranties(user_id);
CREATE INDEX IF NOT EXISTS idx_warranties_end ON warranties(end_date);
CREATE INDEX IF NOT EXISTS idx_sav_tickets_user ON sav_tickets(user_id);

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE sav_tickets ENABLE ROW LEVEL SECURITY;
