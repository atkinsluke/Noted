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

  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await all(`
        SELECT p.*,
          (SELECT COUNT(*) FROM notes n WHERE n.project_id = p.id) as note_count
        FROM projects p
        ORDER BY p.created_at DESC
      `);
      res.json(projects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const { name, description, color } = req.body;
      const id = uuidv4();

      await run(
        `INSERT INTO projects (id, name, description, color) VALUES ($1, $2, $3, $4)`,
        [id, name, description || null, color || '#6366f1']
      );

      const project = await get('SELECT * FROM projects WHERE id = $1', [id]);
      res.status(201).json(project);
    } catch (err) {
      console.error('Error creating project:', err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    try {
      const { name, description, color } = req.body;

      await run(
        `UPDATE projects SET name = $1, description = $2, color = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [name, description, color, req.params.id]
      );

      const project = await get('SELECT * FROM projects WHERE id = $1', [req.params.id]);
      res.json(project);
    } catch (err) {
      console.error('Error updating project:', err);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      await run('DELETE FROM projects WHERE id = $1', [req.params.id]);
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting project:', err);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // ============ NOTES ============

  app.get('/api/projects/:projectId/notes', async (req, res) => {
    try {
      const notes = await all(
        `SELECT * FROM notes WHERE project_id = $1 ORDER BY updated_at DESC`,
        [req.params.projectId]
      );
      res.json(notes);
    } catch (err) {
      console.error('Error fetching notes:', err);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  });

  app.get('/api/notes/:id', async (req, res) => {
    try {
      const note = await get('SELECT * FROM notes WHERE id = $1', [req.params.id]);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      res.json(note);
    } catch (err) {
      console.error('Error fetching note:', err);
      res.status(500).json({ error: 'Failed to fetch note' });
    }
  });

  app.post('/api/projects/:projectId/notes', async (req, res) => {
    try {
      const { title, content } = req.body;
      const id = uuidv4();

      await run(
        `INSERT INTO notes (id, project_id, title, content) VALUES ($1, $2, $3, $4)`,
        [id, req.params.projectId, title || 'Untitled', content || '']
      );

      const note = await get('SELECT * FROM notes WHERE id = $1', [id]);
      res.status(201).json(note);
    } catch (err) {
      console.error('Error creating note:', err);
      res.status(500).json({ error: 'Failed to create note' });
    }
  });

  app.put('/api/notes/:id', async (req, res) => {
    try {
      const { title, content } = req.body;

      // Build dynamic update based on provided fields
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(content);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);
        await run(`UPDATE notes SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
      }

      const note = await get('SELECT * FROM notes WHERE id = $1', [req.params.id]);
      res.json(note);
    } catch (err) {
      console.error('Error updating note:', err);
      res.status(500).json({ error: 'Failed to update note' });
    }
  });

  app.post('/api/notes/:id/move', async (req, res) => {
    try {
      const { projectId } = req.body;

      await run(
        `UPDATE notes SET project_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [projectId, req.params.id]
      );

      const note = await get('SELECT * FROM notes WHERE id = $1', [req.params.id]);
      res.json(note);
    } catch (err) {
      console.error('Error moving note:', err);
      res.status(500).json({ error: 'Failed to move note' });
    }
  });

  app.delete('/api/notes/:id', async (req, res) => {
    try {
      await run('DELETE FROM notes WHERE id = $1', [req.params.id]);
      await run('DELETE FROM tile_positions WHERE note_type = $1 AND note_id = $2', ['note', req.params.id]);
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting note:', err);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  // ============ JOURNAL ============

  app.get('/api/journal', async (req, res) => {
    try {
      const entries = await all(`SELECT * FROM journal_entries ORDER BY date DESC`);
      res.json(entries);
    } catch (err) {
      console.error('Error fetching journal entries:', err);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  app.get('/api/journal/:date', async (req, res) => {
    try {
      let entry = await get('SELECT * FROM journal_entries WHERE date = $1', [req.params.date]);

      // Auto-create entry for the date if it doesn't exist
      if (!entry) {
        const id = uuidv4();
        await run(
          `INSERT INTO journal_entries (id, date, content) VALUES ($1, $2, '')`,
          [id, req.params.date]
        );
        entry = await get('SELECT * FROM journal_entries WHERE id = $1', [id]);
      }

      res.json(entry);
    } catch (err) {
      console.error('Error fetching journal entry:', err);
      res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
  });

  app.put('/api/journal/:date', async (req, res) => {
    try {
      const { content, mood } = req.body;

      await run(
        `UPDATE journal_entries SET content = $1, mood = $2, updated_at = CURRENT_TIMESTAMP WHERE date = $3`,
        [content, mood || null, req.params.date]
      );

      const entry = await get('SELECT * FROM journal_entries WHERE date = $1', [req.params.date]);
      res.json(entry);
    } catch (err) {
      console.error('Error updating journal entry:', err);
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  });

  // ============ QUICK NOTES ============

  app.get('/api/quick-notes', async (req, res) => {
    try {
      const notes = await all(`SELECT * FROM quick_notes WHERE processed = 0 ORDER BY created_at DESC`);
      res.json(notes);
    } catch (err) {
      console.error('Error fetching quick notes:', err);
      res.status(500).json({ error: 'Failed to fetch quick notes' });
    }
  });

  // Webhook endpoint for n8n/Telegram/Email
  app.post('/api/quick-notes', async (req, res) => {
    try {
      const { content, source, metadata } = req.body;
      const id = uuidv4();

      await run(
        `INSERT INTO quick_notes (id, content, source, metadata) VALUES ($1, $2, $3, $4)`,
        [id, content, source || 'manual', JSON.stringify(metadata || {})]
      );

      const note = await get('SELECT * FROM quick_notes WHERE id = $1', [id]);
      res.status(201).json(note);
    } catch (err) {
      console.error('Error creating quick note:', err);
      res.status(500).json({ error: 'Failed to create quick note' });
    }
  });

  // Move quick note to a project
  app.post('/api/quick-notes/:id/move-to-project', async (req, res) => {
    try {
      const { projectId, title } = req.body;
      const quickNote = await get('SELECT * FROM quick_notes WHERE id = $1', [req.params.id]);

      if (!quickNote) return res.status(404).json({ error: 'Quick note not found' });

      const noteId = uuidv4();
      await run(
        `INSERT INTO notes (id, project_id, title, content) VALUES ($1, $2, $3, $4)`,
        [noteId, projectId, title || 'From Quick Notes', quickNote.content]
      );

      await run('UPDATE quick_notes SET processed = 1 WHERE id = $1', [req.params.id]);

      const note = await get('SELECT * FROM notes WHERE id = $1', [noteId]);
      res.json(note);
    } catch (err) {
      console.error('Error moving quick note to project:', err);
      res.status(500).json({ error: 'Failed to move quick note to project' });
    }
  });

  // Move quick note to journal
  app.post('/api/quick-notes/:id/move-to-journal', async (req, res) => {
    try {
      const { date } = req.body;
      const quickNote = await get('SELECT * FROM quick_notes WHERE id = $1', [req.params.id]);

      if (!quickNote) return res.status(404).json({ error: 'Quick note not found' });

      // Get or create journal entry
      let entry = await get('SELECT * FROM journal_entries WHERE date = $1', [date]);
      if (!entry) {
        const id = uuidv4();
        await run(`INSERT INTO journal_entries (id, date, content) VALUES ($1, $2, '')`, [id, date]);
        entry = await get('SELECT * FROM journal_entries WHERE id = $1', [id]);
      }

      // Append to journal
      const newContent = entry.content
        ? `${entry.content}\n\n---\n\n${quickNote.content}`
        : quickNote.content;

      await run(
        `UPDATE journal_entries SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE date = $2`,
        [newContent, date]
      );

      await run('UPDATE quick_notes SET processed = 1 WHERE id = $1', [req.params.id]);

      const updatedEntry = await get('SELECT * FROM journal_entries WHERE date = $1', [date]);
      res.json(updatedEntry);
    } catch (err) {
      console.error('Error moving quick note to journal:', err);
      res.status(500).json({ error: 'Failed to move quick note to journal' });
    }
  });

  app.put('/api/quick-notes/:id', async (req, res) => {
    try {
      const { content } = req.body;

      await run(
        `UPDATE quick_notes SET content = $1 WHERE id = $2`,
        [content, req.params.id]
      );

      const note = await get('SELECT * FROM quick_notes WHERE id = $1', [req.params.id]);
      res.json(note);
    } catch (err) {
      console.error('Error updating quick note:', err);
      res.status(500).json({ error: 'Failed to update quick note' });
    }
  });

  app.delete('/api/quick-notes/:id', async (req, res) => {
    try {
      await run('DELETE FROM quick_notes WHERE id = $1', [req.params.id]);
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting quick note:', err);
      res.status(500).json({ error: 'Failed to delete quick note' });
    }
  });

  // ============ TILE POSITIONS ============

  app.get('/api/tiles', async (req, res) => {
    try {
      const tiles = await all('SELECT * FROM tile_positions');
      res.json(tiles);
    } catch (err) {
      console.error('Error fetching tiles:', err);
      res.status(500).json({ error: 'Failed to fetch tiles' });
    }
  });

  app.get('/api/tiles/:noteType/:noteId', async (req, res) => {
    try {
      const tile = await get(
        'SELECT * FROM tile_positions WHERE note_type = $1 AND note_id = $2',
        [req.params.noteType, req.params.noteId]
      );
      if (!tile) return res.status(404).json({ error: 'Tile position not found' });
      res.json(tile);
    } catch (err) {
      console.error('Error fetching tile:', err);
      res.status(500).json({ error: 'Failed to fetch tile' });
    }
  });

  app.put('/api/tiles/:noteType/:noteId', async (req, res) => {
    try {
      const { x, y, width, height, z_index, is_fullscreen } = req.body;
      const id = uuidv4();

      // Check if exists
      const existing = await get(
        'SELECT * FROM tile_positions WHERE note_type = $1 AND note_id = $2',
        [req.params.noteType, req.params.noteId]
      );

      if (existing) {
        await run(
          `UPDATE tile_positions SET x = $1, y = $2, width = $3, height = $4, z_index = $5, is_fullscreen = $6
           WHERE note_type = $7 AND note_id = $8`,
          [x, y, width, height, z_index || 1, is_fullscreen ? 1 : 0, req.params.noteType, req.params.noteId]
        );
      } else {
        await run(
          `INSERT INTO tile_positions (id, note_type, note_id, x, y, width, height, z_index, is_fullscreen)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, req.params.noteType, req.params.noteId, x, y, width, height, z_index || 1, is_fullscreen ? 1 : 0]
        );
      }

      const tile = await get(
        'SELECT * FROM tile_positions WHERE note_type = $1 AND note_id = $2',
        [req.params.noteType, req.params.noteId]
      );
      res.json(tile);
    } catch (err) {
      console.error('Error updating tile:', err);
      res.status(500).json({ error: 'Failed to update tile' });
    }
  });

  app.delete('/api/tiles/:noteType/:noteId', async (req, res) => {
    try {
      await run(
        'DELETE FROM tile_positions WHERE note_type = $1 AND note_id = $2',
        [req.params.noteType, req.params.noteId]
      );
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting tile:', err);
      res.status(500).json({ error: 'Failed to delete tile' });
    }
  });

  // ============ CONFIG ============

  app.get('/api/config', async (req, res) => {
    try {
      const rows = await all('SELECT * FROM config');
      const config = {};
      rows.forEach((row) => {
        try {
          config[row.key] = JSON.parse(row.value);
        } catch {
          config[row.key] = row.value;
        }
      });
      res.json(config);
    } catch (err) {
      console.error('Error fetching config:', err);
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  });

  app.put('/api/config', async (req, res) => {
    try {
      const updates = req.body;

      for (const [key, value] of Object.entries(updates)) {
        const existing = await get('SELECT * FROM config WHERE key = $1', [key]);
        if (existing) {
          await run(
            `UPDATE config SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2`,
            [JSON.stringify(value), key]
          );
        } else {
          await run(
            `INSERT INTO config (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
            [key, JSON.stringify(value)]
          );
        }
      }

      // Return updated config
      const rows = await all('SELECT * FROM config');
      const config = {};
      rows.forEach((row) => {
        try {
          config[row.key] = JSON.parse(row.value);
        } catch {
          config[row.key] = row.value;
        }
      });
      res.json(config);
    } catch (err) {
      console.error('Error updating config:', err);
      res.status(500).json({ error: 'Failed to update config' });
    }
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
