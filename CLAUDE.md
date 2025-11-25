# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Tiled Notes

A personal note-taking app with Hyprland-style window tiling, built for quick capture and organisation.

## Development Commands

```bash
# Initial setup - creates SQLite database with schema
npm run setup

# Run both server and client concurrently
npm run dev

# Run server only (port 3001)
npm run server

# Run client only (Vite dev server, port 5173)
npm run client

# Build client for production
npm run build
```

**Important**: Always run `npm run setup` first to initialize the database before starting the dev servers.

## Architecture Overview

### Database Layer (sql.js)
- Uses **sql.js** (SQLite compiled to WebAssembly) for in-memory database operations
- Database file stored at `server/data/notes.db`
- **Critical**: `db.js` auto-saves to disk after every mutation via `saveDb()`
- Helper functions in `server/db.js`:
  - `getDb()` - Initialize/retrieve database connection
  - `all(sql, params)` - Execute query, return all results as objects
  - `get(sql, params)` - Execute query, return first result
  - `run(sql, params)` - Execute mutation (INSERT/UPDATE/DELETE), auto-saves

### Database Schema
Five main tables:
- `projects` - Top-level project containers
- `notes` - Notes belonging to projects (with `project_id` FK)
- `journal_entries` - Daily journal entries (unique by `date`)
- `quick_notes` - Inbox for quick captures from Telegram/email/manual entry
  - `processed` flag indicates if triaged to project/journal
  - `source` field: "telegram", "email", or "manual"
  - `metadata` field: JSON string with source-specific data
- `tile_positions` - UI layout state (x, y, width, height, z_index, is_fullscreen)
  - Composite unique key on `(note_type, note_id)`
- `config` - Key-value store for app settings

### Backend (Express)
- Single file: `server/index.js`
- RESTful API with CRUD endpoints for all entities
- Special endpoints:
  - `POST /api/quick-notes` - Webhook receiver for n8n integrations
  - `PUT /api/quick-notes/:id` - Update quick note content
  - `POST /api/quick-notes/:id/move-to-project` - Triage quick note to project
  - `POST /api/quick-notes/:id/move-to-journal` - Triage quick note to journal
  - `POST /api/notes/:id/move` - Move note to different project
  - `GET /api/journal/:date` - Auto-creates journal entry if doesn't exist
  - `GET /api/tiles/:noteType/:noteId` - Get saved tile position

### Frontend (React + Vite)

**State Management**:
- `App.jsx` - Root component managing:
  - `openTiles` - Array of currently open tile objects
  - `activeSection` - Current sidebar section ("quick-notes", "journal", "projects")
  - `config` - Global app config loaded on mount
  - Tile lifecycle methods: `openTile()`, `closeTile()`, `updateTile()`, `bringToFront()`

**Component Hierarchy**:
```
App
├── Sidebar - Navigation and content lists
└── TileCanvas - Main workspace with draggable/resizable tiles
    ├── NoteTile - Regular project note editor
    ├── JournalTile - Daily journal entry editor
    └── QuickNoteTile - Quick note with triage actions
```

**Tiling System (react-rnd)**:
- `TileCanvas.jsx` renders tiles using `Rnd` component from `react-rnd`
- Each tile has: `{ type, id, x, y, width, height, zIndex }`
- **Tile types**: "note", "journal", "quick-note"
- **Fullscreen mode**: Double-click tile header to toggle fullscreen
  - Press Escape to exit fullscreen
  - Fullscreen tiles rendered as absolute positioned divs (not Rnd)
- Drag handle: Elements with `tile-drag-handle` className
- New tiles spawn with 30px offset cascade

**Auto-save Pattern**:
- Notes, journal entries, and quick notes use debounced auto-save (2 second delay)
- `isDirty` flag tracks unsaved changes
- Manual save via Ctrl/Cmd+S keyboard shortcut
- UI indicators: "Unsaved", "Saving...", checkmark when saved

**Sidebar Features**:
- Inline rename: Click pencil icon on notes to rename without opening
- Move notes: Click arrow icon to move note to different project
- Quick note creation: Manual quick notes open as editable tiles

**API Client**:
- `client/src/api.js` - All API calls centralized here
- Uses relative `/api` base path (Vite proxy handles in dev)

## Key Development Patterns

### Adding New Tile Types
1. Add table to schema in `server/setup-db.js`
2. Create REST endpoints in `server/index.js`
3. Add API methods to `client/src/api.js`
4. Create new `*Tile.jsx` component (follow pattern from `NoteTile.jsx`)
5. Add case to `renderTileContent()` switch in `TileCanvas.jsx`
6. Add sidebar section to `Sidebar.jsx` for opening tiles

### Working with sql.js
- **Never** directly call `db.prepare()` in server routes - use helper functions
- Mutations auto-save via `run()` - no need to manually call `saveDb()`
- Database loads into memory on server start - check file exists or run setup

### Tile Positioning
- Tile positions persist to `tile_positions` table via composite key `(note_type, note_id)`
- Updates happen in `TileCanvas` via `onUpdateTile` callback, which saves to DB
- On tile open: if saved position exists, restore it; otherwise use Hyprland-style auto-tiling

## Tech Stack
- **Frontend**: React 18, Vite 5, Tailwind CSS, react-rnd, lucide-react
- **Backend**: Express.js, sql.js, UUID generation
- **Database**: SQLite (via sql.js WebAssembly)
