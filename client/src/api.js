const API_BASE = '/api';

// ============ PROJECTS ============

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  return res.json();
}

export async function createProject(data) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProject(id, data) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProject(id) {
  await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
}

// ============ NOTES ============

export async function fetchNotes(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/notes`);
  return res.json();
}

export async function fetchNote(id) {
  const res = await fetch(`${API_BASE}/notes/${id}`);
  return res.json();
}

export async function createNote(projectId, data) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateNote(id, data) {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteNote(id) {
  await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
}

export async function moveNote(id, projectId) {
  const res = await fetch(`${API_BASE}/notes/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  return res.json();
}

// ============ JOURNAL ============

export async function fetchJournalEntries() {
  const res = await fetch(`${API_BASE}/journal`);
  return res.json();
}

export async function fetchJournalEntry(date) {
  const res = await fetch(`${API_BASE}/journal/${date}`);
  return res.json();
}

export async function updateJournalEntry(date, data) {
  const res = await fetch(`${API_BASE}/journal/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ============ QUICK NOTES ============

export async function fetchQuickNotes() {
  const res = await fetch(`${API_BASE}/quick-notes`);
  return res.json();
}

export async function createQuickNote(data) {
  const res = await fetch(`${API_BASE}/quick-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function moveQuickNoteToProject(id, projectId, title) {
  const res = await fetch(`${API_BASE}/quick-notes/${id}/move-to-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, title }),
  });
  return res.json();
}

export async function moveQuickNoteToJournal(id, date) {
  const res = await fetch(`${API_BASE}/quick-notes/${id}/move-to-journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  return res.json();
}

export async function updateQuickNote(id, data) {
  const res = await fetch(`${API_BASE}/quick-notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteQuickNote(id) {
  await fetch(`${API_BASE}/quick-notes/${id}`, { method: 'DELETE' });
}

// ============ TILES ============

export async function fetchTiles() {
  const res = await fetch(`${API_BASE}/tiles`);
  return res.json();
}

export async function fetchTilePosition(noteType, noteId) {
  const res = await fetch(`${API_BASE}/tiles/${noteType}/${noteId}`);
  if (res.status === 404) return null;
  return res.json();
}

export async function updateTilePosition(noteType, noteId, data) {
  const res = await fetch(`${API_BASE}/tiles/${noteType}/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteTile(noteType, noteId) {
  await fetch(`${API_BASE}/tiles/${noteType}/${noteId}`, { method: 'DELETE' });
}

// ============ CONFIG ============

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function updateConfig(data) {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
