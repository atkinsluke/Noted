import React, { useState, useEffect, useCallback } from 'react';
import { X, FolderOpen, BookOpen, Trash2, Mail, MessageCircle, Edit3, Check } from 'lucide-react';
import {
  fetchProjects,
  moveQuickNoteToProject,
  moveQuickNoteToJournal,
  deleteQuickNote,
  updateQuickNote,
} from '../api';

export default function QuickNoteTile({ quickNote, onClose, onRefreshSidebar }) {
  const [projects, setProjects] = useState([]);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [content, setContent] = useState(quickNote.content || '');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  const save = useCallback(async () => {
    if (!isDirty) return;

    setIsSaving(true);
    await updateQuickNote(quickNote.id, { content });
    setIsDirty(false);
    setIsSaving(false);
    setLastSaved(new Date());
    onRefreshSidebar();
  }, [quickNote.id, content, isDirty, onRefreshSidebar]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      save();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isDirty, content, save]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  const handleMoveToProject = async (projectId) => {
    await moveQuickNoteToProject(quickNote.id, projectId, noteTitle || 'From Quick Notes');
    onRefreshSidebar();
    onClose();
  };

  const handleMoveToJournal = async () => {
    const today = new Date().toISOString().split('T')[0];
    await moveQuickNoteToJournal(quickNote.id, today);
    onRefreshSidebar();
    onClose();
  };

  const handleDelete = async () => {
    if (confirm('Delete this quick note?')) {
      await deleteQuickNote(quickNote.id);
      onRefreshSidebar();
      onClose();
    }
  };

  const getSourceIcon = () => {
    switch (quickNote.source) {
      case 'email':
        return <Mail size={14} className="text-blue-400" />;
      case 'telegram':
        return <MessageCircle size={14} className="text-sky-400" />;
      default:
        return <Edit3 size={14} className="text-zinc-400" />;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="tile-drag-handle flex items-center justify-between px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 cursor-move">
        <div className="flex items-center gap-2">
          {getSourceIcon()}
          <span className="text-sm font-medium text-amber-200">Quick Note</span>
          <span className="text-xs text-amber-500/60">
            via {quickNote.source}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isDirty && (
            <span className="text-xs text-zinc-500 mr-2">Unsaved</span>
          )}
          {isSaving && (
            <span className="text-xs text-amber-500 mr-2">Saving...</span>
          )}
          {!isDirty && lastSaved && (
            <Check size={14} className="text-emerald-500 mr-2" />
          )}
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setIsDirty(true);
          }}
          className="note-editor"
          placeholder="Start writing..."
        />
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-surface-4 space-y-2">
        {showMoveMenu ? (
          <div className="space-y-2">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title (optional)"
              className="w-full bg-surface-3 text-sm px-3 py-2 rounded border border-surface-4 focus:border-accent focus:outline-none"
            />
            <div className="text-xs text-zinc-500 mb-2">Move to project:</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleMoveToProject(project.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded hover:bg-surface-3"
                >
                  <FolderOpen size={14} style={{ color: project.color }} />
                  <span>{project.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMoveMenu(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowMoveMenu(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface-3 hover:bg-surface-4 rounded text-sm"
            >
              <FolderOpen size={14} />
              <span>Move to Project</span>
            </button>
            <button
              onClick={handleMoveToJournal}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface-3 hover:bg-surface-4 rounded text-sm"
            >
              <BookOpen size={14} />
              <span>Add to Journal</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2 bg-surface-3 hover:bg-red-500/20 hover:text-red-400 rounded text-sm"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
