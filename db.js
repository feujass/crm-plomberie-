const path = require("path");
const fs = require("fs/promises");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "crm.sqlite");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const openDb = async () =>
  open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

const initDb = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const db = await openDb();
  await db.exec("PRAGMA foreign_keys = ON;");
  const schema = await fs.readFile(SCHEMA_PATH, "utf-8");
  await db.exec(schema);
  const columns = await db.all(`PRAGMA table_info(quotes)`);
  const columnNames = columns.map((column) => column.name);
  if (!columnNames.includes("materials_desc")) {
    await db.exec(`ALTER TABLE quotes ADD COLUMN materials_desc TEXT`);
  }
  if (!columnNames.includes("materials_total")) {
    await db.exec(`ALTER TABLE quotes ADD COLUMN materials_total REAL`);
  }
  const projectColumns = await db.all(`PRAGMA table_info(projects)`);
  const projectNames = projectColumns.map((column) => column.name);
  if (!projectNames.includes("responsible")) {
    await db.exec(`ALTER TABLE projects ADD COLUMN responsible TEXT`);
  }
  if (!projectNames.includes("comment")) {
    await db.exec(`ALTER TABLE projects ADD COLUMN comment TEXT`);
  }
  if (!projectNames.includes("google_event_id")) {
    await db.exec(`ALTER TABLE projects ADD COLUMN google_event_id TEXT`);
  }
  const quoteColumns = await db.all(`PRAGMA table_info(quotes)`);
  const quoteNames = quoteColumns.map((column) => column.name);
  if (!quoteNames.includes("accept_token")) {
    await db.exec(`ALTER TABLE quotes ADD COLUMN accept_token TEXT`);
  }
  if (!quoteNames.includes("accepted_at")) {
    await db.exec(`ALTER TABLE quotes ADD COLUMN accepted_at TEXT`);
  }
  if (!quoteNames.includes("signature_name")) {
    await db.exec(`ALTER TABLE quotes ADD COLUMN signature_name TEXT`);
  }
  if (!quoteNames.includes("signature_data")) {
    await db.exec(`ALTER TABLE quotes ADD COLUMN signature_data TEXT`);
  }
  const settingsColumns = await db.all(`PRAGMA table_info(settings)`);
  const settingsNames = settingsColumns.map((column) => column.name);
  if (!settingsNames.includes("google_refresh_token")) {
    await db.exec(`ALTER TABLE settings ADD COLUMN google_refresh_token TEXT`);
  }
  if (!settingsNames.includes("google_calendar_id")) {
    await db.exec(`ALTER TABLE settings ADD COLUMN google_calendar_id TEXT`);
  }
  return db;
};

const ensureSingleUser = async (db) => {
  const existing = await db.get(`SELECT id FROM users WHERE email = ?`, ["CRMplomberie"]);
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash("911schepor", 10);
  const result = await db.run(
    `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
    ["CRM Plomberie", "CRMplomberie", passwordHash]
  );
  return result.lastID;
};

const clearOperationalData = async (db, userId) => {
  await db.run(`DELETE FROM quotes WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM projects WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
  await db.run(`DELETE FROM clients WHERE user_id = ?`, [userId]);
};

const resetUserData = async (db, userId) => {
  await clearOperationalData(db, userId);
};

const cleanupDemoDataOnce = async (db, userId) => {
  await db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);
  const existing = await db.get(`SELECT value FROM meta WHERE key = ?`, ["cleaned_demo"]);
  if (existing) return;
  await clearOperationalData(db, userId);
  await db.run(`INSERT INTO meta (key, value) VALUES (?, ?)`, ["cleaned_demo", "true"]);
};

module.exports = {
  initDb,
  ensureSingleUser,
  resetUserData,
  cleanupDemoDataOnce,
};
