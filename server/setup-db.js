import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'notes.db');

async function setup() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables
  db.run(`
    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notes table (belongs to a project)
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- Journal entries table
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      mood TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Quick notes table (inbox for captures)
    CREATE TABLE IF NOT EXISTS quick_notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      metadata TEXT,
      processed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tile positions table (stores layout state)
    CREATE TABLE IF NOT EXISTS tile_positions (
      id TEXT PRIMARY KEY,
      note_type TEXT NOT NULL,
      note_id TEXT NOT NULL,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      width REAL DEFAULT 400,
      height REAL DEFAULT 300,
      z_index INTEGER DEFAULT 1,
      is_fullscreen INTEGER DEFAULT 0,
      UNIQUE(note_type, note_id)
    );

    -- Config table (key-value store for settings)
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default config values
  const defaults = [
    ['theme', '"dark"'],
    ['tile_gap', '12'],
    ['default_tile_width', '400'],
    ['default_tile_height', '300'],
    ['accent_color', '"#6366f1"'],
    ['font_family', '"Inter, system-ui, sans-serif"'],
    ['font_size_base', '14'],
    ['animation_speed', '200'],
    ['keybindings', '{"fullscreen": "Escape", "newNote": "ctrl+n", "save": "ctrl+s"}']
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
  for (const [key, value] of defaults) {
    stmt.run([key, value]);
  }
  stmt.free();

  // Save to file
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('Database setup complete!');
  db.close();
}

setup().catch(console.error);
