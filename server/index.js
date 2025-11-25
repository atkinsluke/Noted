import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDb, all, get, run } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Initialize database before starting server
async function start() {
  await getDb();
  console.log('Database connected');

  // ============ PROJECTS ============

  app.get('/api/projects', (req, res) => {
    const projects = all(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM notes n WHERE n.project_id = p.id) as note_count 
      FROM projects p 
      ORDER BY p.created_at DESC
    `);
    res.json(projects);
  });

  app.post('/api/projects', (req, res) => {
    const { name, description, color } = req.body;
    const id = uuidv4();

    run(
      `INSERT INTO projects (id, name, description, color) VALUES (?, ?, ?, ?)`,
      [id, name, description || null, color || '#6366f1']
    );

    const project = get('SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json(project);
  });

  app.put('/api/projects/:id', (req, res) => {
    const { name, description, color } = req.body;

    run(
      `UPDATE projects SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, description, color, req.params.id]
    );

    const project = get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json(project);
  });

  app.delete('/api/projects/:id', (req, res) => {
    run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.status(204).send();
  });

  // ============ NOTES ============

  app.get('/api/projects/:projectId/notes', (req, res) => {
    const notes = all(
      `SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC`,
      [req.params.projectId]
    );
    res.json(notes);
  });

  app.get('/api/notes/:id', (req, res) => {
    const note = get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  });

  app.post('/api/projects/:projectId/notes', (req, res) => {
    const { title, content } = req.body;
    const id = uuidv4();

    run(
      `INSERT INTO notes (id, project_id, title, content) VALUES (?, ?, ?, ?)`,
      [id, req.params.projectId, title || 'Untitled', content || '']
    );

    const note = get('SELECT * FROM notes WHERE id = ?', [id]);
    res.status(201).json(note);
  });

  app.put('/api/notes/:id', (req, res) => {
    const { title, content } = req.body;

    // Build dynamic update based on provided fields
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      run(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const note = get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    res.json(note);
  });

  app.post('/api/notes/:id/move', (req, res) => {
    const { projectId } = req.body;

    run(
      `UPDATE notes SET project_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [projectId, req.params.id]
    );

    const note = get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    res.json(note);
  });

  app.delete('/api/notes/:id', (req, res) => {
    run('DELETE FROM notes WHERE id = ?', [req.params.id]);
    run('DELETE FROM tile_positions WHERE note_type = ? AND note_id = ?', ['note', req.params.id]);
    res.status(204).send();
  });

  // ============ JOURNAL ============

  app.get('/api/journal', (req, res) => {
    const entries = all(`SELECT * FROM journal_entries ORDER BY date DESC`);
    res.json(entries);
  });

  app.get('/api/journal/:date', (req, res) => {
    let entry = get('SELECT * FROM journal_entries WHERE date = ?', [req.params.date]);

    // Auto-create entry for the date if it doesn't exist
    if (!entry) {
      const id = uuidv4();
      run(
        `INSERT INTO journal_entries (id, date, content) VALUES (?, ?, '')`,
        [id, req.params.date]
      );
      entry = get('SELECT * FROM journal_entries WHERE id = ?', [id]);
    }

    res.json(entry);
  });

  app.put('/api/journal/:date', (req, res) => {
    const { content, mood } = req.body;

    run(
      `UPDATE journal_entries SET content = ?, mood = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?`,
      [content, mood || null, req.params.date]
    );

    const entry = get('SELECT * FROM journal_entries WHERE date = ?', [req.params.date]);
    res.json(entry);
  });

  // ============ QUICK NOTES ============

  app.get('/api/quick-notes', (req, res) => {
    const notes = all(`SELECT * FROM quick_notes WHERE processed = 0 ORDER BY created_at DESC`);
    res.json(notes);
  });

  // Webhook endpoint for n8n/Telegram/Email
  app.post('/api/quick-notes', (req, res) => {
    const { content, source, metadata } = req.body;
    const id = uuidv4();

    run(
      `INSERT INTO quick_notes (id, content, source, metadata) VALUES (?, ?, ?, ?)`,
      [id, content, source || 'manual', JSON.stringify(metadata || {})]
    );

    const note = get('SELECT * FROM quick_notes WHERE id = ?', [id]);
    res.status(201).json(note);
  });

  // Move quick note to a project
  app.post('/api/quick-notes/:id/move-to-project', (req, res) => {
    const { projectId, title } = req.body;
    const quickNote = get('SELECT * FROM quick_notes WHERE id = ?', [req.params.id]);

    if (!quickNote) return res.status(404).json({ error: 'Quick note not found' });

    const noteId = uuidv4();
    run(
      `INSERT INTO notes (id, project_id, title, content) VALUES (?, ?, ?, ?)`,
      [noteId, projectId, title || 'From Quick Notes', quickNote.content]
    );

    run('UPDATE quick_notes SET processed = 1 WHERE id = ?', [req.params.id]);

    const note = get('SELECT * FROM notes WHERE id = ?', [noteId]);
    res.json(note);
  });

  // Move quick note to journal
  app.post('/api/quick-notes/:id/move-to-journal', (req, res) => {
    const { date } = req.body;
    const quickNote = get('SELECT * FROM quick_notes WHERE id = ?', [req.params.id]);

    if (!quickNote) return res.status(404).json({ error: 'Quick note not found' });

    // Get or create journal entry
    let entry = get('SELECT * FROM journal_entries WHERE date = ?', [date]);
    if (!entry) {
      const id = uuidv4();
      run(`INSERT INTO journal_entries (id, date, content) VALUES (?, ?, '')`, [id, date]);
      entry = get('SELECT * FROM journal_entries WHERE id = ?', [id]);
    }

    // Append to journal
    const newContent = entry.content
      ? `${entry.content}\n\n---\n\n${quickNote.content}`
      : quickNote.content;

    run(
      `UPDATE journal_entries SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?`,
      [newContent, date]
    );

    run('UPDATE quick_notes SET processed = 1 WHERE id = ?', [req.params.id]);

    res.json(get('SELECT * FROM journal_entries WHERE date = ?', [date]));
  });

  app.put('/api/quick-notes/:id', (req, res) => {
    const { content } = req.body;

    run(
      `UPDATE quick_notes SET content = ? WHERE id = ?`,
      [content, req.params.id]
    );

    const note = get('SELECT * FROM quick_notes WHERE id = ?', [req.params.id]);
    res.json(note);
  });

  app.delete('/api/quick-notes/:id', (req, res) => {
    run('DELETE FROM quick_notes WHERE id = ?', [req.params.id]);
    res.status(204).send();
  });

  // ============ TILE POSITIONS ============

  app.get('/api/tiles', (req, res) => {
    const tiles = all('SELECT * FROM tile_positions');
    res.json(tiles);
  });

  app.get('/api/tiles/:noteType/:noteId', (req, res) => {
    const tile = get(
      'SELECT * FROM tile_positions WHERE note_type = ? AND note_id = ?',
      [req.params.noteType, req.params.noteId]
    );
    if (!tile) return res.status(404).json({ error: 'Tile position not found' });
    res.json(tile);
  });

  app.put('/api/tiles/:noteType/:noteId', (req, res) => {
    const { x, y, width, height, z_index, is_fullscreen } = req.body;
    const id = uuidv4();

    // Check if exists
    const existing = get(
      'SELECT * FROM tile_positions WHERE note_type = ? AND note_id = ?',
      [req.params.noteType, req.params.noteId]
    );

    if (existing) {
      run(
        `UPDATE tile_positions SET x = ?, y = ?, width = ?, height = ?, z_index = ?, is_fullscreen = ? 
         WHERE note_type = ? AND note_id = ?`,
        [x, y, width, height, z_index || 1, is_fullscreen ? 1 : 0, req.params.noteType, req.params.noteId]
      );
    } else {
      run(
        `INSERT INTO tile_positions (id, note_type, note_id, x, y, width, height, z_index, is_fullscreen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, req.params.noteType, req.params.noteId, x, y, width, height, z_index || 1, is_fullscreen ? 1 : 0]
      );
    }

    const tile = get(
      'SELECT * FROM tile_positions WHERE note_type = ? AND note_id = ?',
      [req.params.noteType, req.params.noteId]
    );
    res.json(tile);
  });

  app.delete('/api/tiles/:noteType/:noteId', (req, res) => {
    run(
      'DELETE FROM tile_positions WHERE note_type = ? AND note_id = ?',
      [req.params.noteType, req.params.noteId]
    );
    res.status(204).send();
  });

  // ============ CONFIG ============

  app.get('/api/config', (req, res) => {
    const rows = all('SELECT * FROM config');
    const config = {};
    rows.forEach((row) => {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    });
    res.json(config);
  });

  app.put('/api/config', (req, res) => {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      const existing = get('SELECT * FROM config WHERE key = ?', [key]);
      if (existing) {
        run(
          `UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
          [JSON.stringify(value), key]
        );
      } else {
        run(
          `INSERT INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [key, JSON.stringify(value)]
        );
      }
    }

    // Return updated config
    const rows = all('SELECT * FROM config');
    const config = {};
    rows.forEach((row) => {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    });
    res.json(config);
  });

  // ============ WEBHOOKS (for n8n) ============

  app.post('/api/webhooks/note-created', (req, res) => {
    // Placeholder for outgoing webhook - you'd call n8n from here
    console.log('Note created webhook:', req.body);
    res.json({ status: 'ok' });
  });

  // SPA fallback - serve index.html for all non-API routes in production
  if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
