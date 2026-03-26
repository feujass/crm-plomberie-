-- PlombiCRM – Supabase PostgreSQL schema
-- Run this in the Supabase SQL Editor to create all tables.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  segment TEXT NOT NULL,
  last_project TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_price DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  material_id BIGINT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  hours DOUBLE PRECISION NOT NULL,
  discount DOUBLE PRECISION NOT NULL DEFAULT 0,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  ack BOOLEAN NOT NULL DEFAULT FALSE,
  materials_desc TEXT,
  materials_total DOUBLE PRECISION,
  accept_token TEXT,
  accepted_at TEXT,
  signature_name TEXT,
  signature_data TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  responsible TEXT,
  comment TEXT,
  google_event_id TEXT,
  site_address TEXT NOT NULL DEFAULT '',
  chantier_type TEXT NOT NULL DEFAULT 'plomberie',
  quote_id BIGINT REFERENCES quotes(id) ON DELETE SET NULL,
  budget_estime DOUBLE PRECISION NOT NULL DEFAULT 0,
  heures_prevues DOUBLE PRECISION NOT NULL DEFAULT 0,
  heures_passees DOUBLE PRECISION NOT NULL DEFAULT 0,
  etape_metier TEXT NOT NULL DEFAULT 'terrassement',
  photo_urls TEXT NOT NULL DEFAULT '[]',
  a_relancer BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  labor_rate DOUBLE PRECISION NOT NULL DEFAULT 65,
  satisfaction_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  satisfaction_responses INTEGER NOT NULL DEFAULT 0,
  google_refresh_token TEXT,
  google_calendar_id TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Disable RLS on all tables (single-user CRM, backend uses service_role key)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta ENABLE ROW LEVEL SECURITY;

-- Allow full access via service_role key (bypasses RLS automatically)
-- No row-level policies needed since we use service_role key from backend
