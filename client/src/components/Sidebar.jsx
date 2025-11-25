import React, { useState, useEffect } from 'react';
import {
  Inbox,
  BookOpen,
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Settings,
  Trash2,
  Pencil,
  MoveRight,
} from 'lucide-react';
import {
  fetchProjects,
  fetchNotes,
  fetchQuickNotes,
  fetchJournalEntries,
  createProject,
  createNote,
  createQuickNote,
  deleteProject,
  deleteNote,
  updateNote,
  moveNote,
} from '../api';

export default function Sidebar({
  activeSection,
  onSectionChange,
  onWorkspaceChange,
  onOpenTile,
  onShowConfig,
  config,
}) {
  const [projects, setProjects] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [projectNotes, setProjectNotes] = useState({});
  const [quickNotes, setQuickNotes] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewQuickNote, setShowNewQuickNote] = useState(false);
  const [newQuickNoteContent, setNewQuickNoteContent] = useState('');
  const [showNewJournalEntry, setShowNewJournalEntry] = useState(false);
  const [newJournalDate, setNewJournalDate] = useState('');
  const [renamingNoteId, setRenamingNoteId] = useState(null);
  const [renamingNoteTitle, setRenamingNoteTitle] = useState('');
  const [renamingCancelled, setRenamingCancelled] = useState(false);
  const [movingNote, setMovingNote] = useState(null); // { id, fromProjectId }

  // Load initial data
  useEffect(() => {
    loadProjects();
    loadQuickNotes();
    loadJournalEntries();
  }, []);

  const loadProjects = async () => {
    const data = await fetchProjects();
    setProjects(data);
  };

  const loadQuickNotes = async () => {
    const data = await fetchQuickNotes();
    setQuickNotes(data);
  };

  const loadJournalEntries = async () => {
    const data = await fetchJournalEntries();
    setJournalEntries(data);
  };

  const loadProjectNotes = async (projectId) => {
    const notes = await fetchNotes(projectId);
    setProjectNotes((prev) => ({ ...prev, [projectId]: notes }));
  };

  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => {
      const isExpanding = !prev[projectId];
      if (isExpanding && !projectNotes[projectId]) {
        loadProjectNotes(projectId);
      }
      return { ...prev, [projectId]: isExpanding };
    });
    // Switch to this project's workspace
    onSectionChange('projects');
    onWorkspaceChange(`project-${projectId}`);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    await createProject({ name: newProjectName });
    setNewProjectName('');
    setShowNewProject(false);
    loadProjects();
  };

  const handleCreateNote = async (projectId) => {
    const note = await createNote(projectId, { title: 'Untitled Note' });
    await loadProjectNotes(projectId);
    onSectionChange('projects');
    onWorkspaceChange(`project-${projectId}`);
    onOpenTile({ type: 'note', id: note.id, title: note.title, projectId }, `project-${projectId}`);
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (confirm('Delete this project and all its notes?')) {
      await deleteProject(projectId);
      loadProjects();
    }
  };

  const handleDeleteNote = async (e, noteId, projectId) => {
    e.stopPropagation();
    if (confirm('Delete this note?')) {
      await deleteNote(noteId);
      loadProjectNotes(projectId);
    }
  };

  const startRenaming = (e, note) => {
    e.stopPropagation();
    setRenamingNoteId(note.id);
    setRenamingNoteTitle(note.title);
  };

  const handleRenameNote = async (projectId) => {
    if (renamingCancelled || !renamingNoteTitle.trim() || !renamingNoteId) {
      setRenamingCancelled(false);
      setRenamingNoteId(null);
      setRenamingNoteTitle('');
      return;
    }

    const noteId = renamingNoteId;
    const newTitle = renamingNoteTitle;
    setRenamingNoteId(null);
    setRenamingNoteTitle('');

    await updateNote(noteId, { title: newTitle });
    loadProjectNotes(projectId);
  };

  const cancelRenaming = () => {
    setRenamingCancelled(true);
  };

  const startMovingNote = (e, note, fromProjectId) => {
    e.stopPropagation();
    setMovingNote({ id: note.id, fromProjectId });
  };

  const handleMoveNote = async (toProjectId) => {
    if (!movingNote || movingNote.fromProjectId === toProjectId) {
      setMovingNote(null);
      return;
    }

    await moveNote(movingNote.id, toProjectId);
    await loadProjectNotes(movingNote.fromProjectId);
    await loadProjectNotes(toProjectId);
    setMovingNote(null);
  };

  const handleCreateQuickNote = async (e) => {
    e.preventDefault();
    if (!newQuickNoteContent.trim()) return;

    const newNote = await createQuickNote({ content: newQuickNoteContent, source: 'manual' });
    setNewQuickNoteContent('');
    setShowNewQuickNote(false);
    loadQuickNotes();

    // Open the newly created note as a tile in the quick-notes workspace
    onSectionChange('quick-notes');
    onWorkspaceChange('quick-notes');
    onOpenTile({
      type: 'quick-note',
      id: newNote.id,
      title: newNote.content.slice(0, 30) + '...',
      content: newNote.content,
      source: newNote.source,
    }, 'quick-notes');
  };

  const handleCreateJournalEntry = (e) => {
    e.preventDefault();
    if (!newJournalDate) return;

    onSectionChange('journal');
    onWorkspaceChange('journal');
    onOpenTile({
      type: 'journal',
      id: newJournalDate,
      title: `Journal - ${newJournalDate}`,
    }, 'journal');
    setNewJournalDate('');
    setShowNewJournalEntry(false);
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <aside className="w-64 h-full bg-surface-1 border-r border-surface-3 flex flex-col">
      {/* Logo / Header */}
      <div className="p-4 border-b border-surface-3 flex items-center gap-3">
        <img src="/favicon.svg" alt="Noted Logo" className="w-8 h-8" />
        <h1 className="text-lg font-semibold text-zinc-100">Noted!!!</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Quick Notes */}
        <div className="mb-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onSectionChange('quick-notes');
                onWorkspaceChange('quick-notes');
              }}
              className={`sidebar-item flex-1 flex items-center gap-2 px-3 py-2 rounded text-sm text-left ${
                activeSection === 'quick-notes' ? 'active' : ''
              }`}
            >
              <Inbox size={16} className="text-amber-500" />
              <span>Quick Notes</span>
              {quickNotes.length > 0 && (
                <span className="ml-auto bg-amber-500/20 text-amber-500 text-xs px-1.5 py-0.5 rounded">
                  {quickNotes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                onSectionChange('quick-notes');
                onWorkspaceChange('quick-notes');
                setShowNewQuickNote(true);
              }}
              className="text-zinc-500 hover:text-zinc-300 p-2"
            >
              <Plus size={14} />
            </button>
          </div>

          {showNewQuickNote && (
            <form onSubmit={handleCreateQuickNote} className="px-3 mt-2 space-y-2">
              <textarea
                value={newQuickNoteContent}
                onChange={(e) => setNewQuickNoteContent(e.target.value)}
                placeholder="Quick note content..."
                autoFocus
                rows={3}
                className="w-full bg-surface-3 text-sm px-2 py-1 rounded border border-surface-4 focus:border-accent focus:outline-none resize-none"
              />
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5 rounded"
              >
                Create Quick Note
              </button>
            </form>
          )}
          
          {activeSection === 'quick-notes' && quickNotes.length > 0 && (
            <div className="ml-4 mt-1 space-y-1">
              {quickNotes.slice(0, 5).map((note) => (
                <button
                  key={note.id}
                  onClick={() =>
                    onOpenTile({
                      type: 'quick-note',
                      id: note.id,
                      title: note.content.slice(0, 30) + '...',
                      content: note.content,
                      source: note.source,
                    }, 'quick-notes')
                  }
                  className="w-full text-left text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 truncate"
                >
                  {note.content.slice(0, 40)}...
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Journal */}
        <div className="mb-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onSectionChange('journal');
                onWorkspaceChange('journal');
                onOpenTile({
                  type: 'journal',
                  id: getTodayDate(),
                  title: `Journal - ${getTodayDate()}`,
                }, 'journal');
              }}
              className={`sidebar-item flex-1 flex items-center gap-2 px-3 py-2 rounded text-sm text-left ${
                activeSection === 'journal' ? 'active' : ''
              }`}
            >
              <BookOpen size={16} className="text-emerald-500" />
              <span>Journal</span>
            </button>
            <button
              onClick={() => {
                onSectionChange('journal');
                onWorkspaceChange('journal');
                setShowNewJournalEntry(true);
                setNewJournalDate(getTodayDate());
              }}
              className="text-zinc-500 hover:text-zinc-300 p-2"
            >
              <Plus size={14} />
            </button>
          </div>

          {showNewJournalEntry && (
            <form onSubmit={handleCreateJournalEntry} className="px-3 mt-2 space-y-2">
              <input
                type="date"
                value={newJournalDate}
                onChange={(e) => setNewJournalDate(e.target.value)}
                autoFocus
                className="w-full bg-surface-3 text-sm px-2 py-1 rounded border border-surface-4 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded"
              >
                Open Journal Entry
              </button>
            </form>
          )}
          
          {activeSection === 'journal' && journalEntries.length > 0 && (
            <div className="ml-4 mt-1 space-y-1">
              {journalEntries.slice(0, 7).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() =>
                    onOpenTile({
                      type: 'journal',
                      id: entry.date,
                      title: `Journal - ${entry.date}`,
                    }, 'journal')
                  }
                  className="w-full text-left text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                >
                  {entry.date}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="mb-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Projects
            </span>
            <button
              onClick={() => setShowNewProject(true)}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <Plus size={14} />
            </button>
          </div>

          {showNewProject && (
            <form onSubmit={handleCreateProject} className="px-3 mb-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name..."
                autoFocus
                className="w-full bg-surface-3 text-sm px-2 py-1 rounded border border-surface-4 focus:border-accent focus:outline-none"
                onBlur={() => {
                  if (!newProjectName.trim()) setShowNewProject(false);
                }}
              />
            </form>
          )}

          {projects.map((project) => (
            <div key={project.id}>
              <button
                onClick={() => toggleProject(project.id)}
                className="sidebar-item w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left group"
              >
                {expandedProjects[project.id] ? (
                  <ChevronDown size={14} className="text-zinc-500" />
                ) : (
                  <ChevronRight size={14} className="text-zinc-500" />
                )}
                <FolderOpen
                  size={16}
                  style={{ color: project.color }}
                />
                <span className="flex-1 truncate">{project.name}</span>
                <span className="text-xs text-zinc-600">{project.note_count}</span>
                <button
                  onClick={(e) => handleDeleteProject(e, project.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 p-1"
                >
                  <Trash2 size={12} />
                </button>
              </button>

              {expandedProjects[project.id] && (
                <div className="ml-6 space-y-1">
                  {projectNotes[project.id]?.map((note) => (
                    renamingNoteId === note.id ? (
                      <form
                        key={note.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRenameNote(project.id);
                        }}
                        className="flex items-center gap-2 px-2 py-1"
                      >
                        <FileText size={14} className="text-zinc-500" />
                        <input
                          type="text"
                          value={renamingNoteTitle}
                          onChange={(e) => setRenamingNoteTitle(e.target.value)}
                          autoFocus
                          className="flex-1 bg-surface-3 text-sm px-2 py-0.5 rounded border border-surface-4 focus:border-accent focus:outline-none text-zinc-300"
                          onBlur={() => handleRenameNote(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.target.blur();
                              cancelRenaming();
                            }
                          }}
                        />
                      </form>
                    ) : movingNote?.id === note.id ? (
                      <div key={note.id} className="px-2 py-1 space-y-1">
                        <div className="text-xs text-zinc-400 mb-1">Move to:</div>
                        {projects.filter(p => p.id !== project.id).map(targetProject => (
                          <button
                            key={targetProject.id}
                            onClick={() => handleMoveNote(targetProject.id)}
                            className="w-full flex items-center gap-2 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 rounded"
                          >
                            <FolderOpen size={12} style={{ color: targetProject.color }} />
                            {targetProject.name}
                          </button>
                        ))}
                        <button
                          onClick={() => setMovingNote(null)}
                          className="w-full text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        key={note.id}
                        onClick={() => {
                          onSectionChange('projects');
                          onWorkspaceChange(`project-${project.id}`);
                          onOpenTile({
                            type: 'note',
                            id: note.id,
                            title: note.title,
                            projectId: project.id,
                          }, `project-${project.id}`);
                        }}
                        className="sidebar-item w-full flex items-center gap-2 px-2 py-1 rounded text-sm text-left group"
                      >
                        <FileText size={14} className="text-zinc-500" />
                        <span className="flex-1 truncate text-zinc-400">
                          {note.title}
                        </span>
                        <button
                          onClick={(e) => startMovingNote(e, note, project.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 p-1"
                          title="Move to another project"
                        >
                          <MoveRight size={12} />
                        </button>
                        <button
                          onClick={(e) => startRenaming(e, note)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 p-1"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNote(e, note.id, project.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </button>
                    )
                  ))}
                  <button
                    onClick={() => handleCreateNote(project.id)}
                    className="w-full flex items-center gap-2 px-2 py-1 text-xs text-zinc-600 hover:text-zinc-400"
                  >
                    <Plus size={12} />
                    <span>New Note</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-surface-3">
        <button
          onClick={onShowConfig}
          className="sidebar-item w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-zinc-400 hover:text-zinc-200"
        >
          <Settings size={16} />
          <span>Config</span>
        </button>
      </div>
    </aside>
  );
}
