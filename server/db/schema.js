import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'recoverwwatch.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      photos TEXT DEFAULT '[]',
      structured_profile TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      city TEXT,
      search_radius INTEGER DEFAULT 50,
      scan_frequency TEXT DEFAULT 'daily',
      active INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
      platform TEXT,
      ran_at TEXT DEFAULT (datetime('now')),
      listings_found INTEGER DEFAULT 0,
      matches_flagged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
      scan_id INTEGER REFERENCES scans(id) ON DELETE SET NULL,
      platform TEXT,
      listing_id TEXT,
      url TEXT,
      title TEXT,
      description TEXT,
      price TEXT,
      location TEXT,
      images TEXT DEFAULT '[]',
      match_score TEXT,
      ai_analysis TEXT,
      flagged_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'new'
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      notification_email TEXT,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_user TEXT,
      smtp_pass TEXT
    );

    -- Seed settings row if it doesn't exist
    INSERT OR IGNORE INTO settings (id) VALUES (1);

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_scans_item_id ON scans(item_id);
    CREATE INDEX IF NOT EXISTS idx_listings_item_id ON listings(item_id);
    CREATE INDEX IF NOT EXISTS idx_listings_scan_id ON listings(scan_id);
    CREATE INDEX IF NOT EXISTS idx_listings_match_score ON listings(match_score);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_active ON items(active);
  `);
}

export default db;
