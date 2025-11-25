import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Check } from 'lucide-react';
import { fetchNote, updateNote } from '../api';

export default function NoteTile({ noteId, onClose, onRefreshSidebar }) {
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    fetchNote(noteId).then((data) => {
      setNote(data);
      setTitle(data.title);
      setContent(data.content);
    });
  }, [noteId]);

  const save = useCallback(async () => {
    if (!isDirty) return;
    
    setIsSaving(true);
    await updateNote(noteId, { title, content });
    setIsDirty(false);
    setIsSaving(false);
    setLastSaved(new Date());
    onRefreshSidebar();
  }, [noteId, title, content, isDirty, onRefreshSidebar]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setTimeout(() => {
      save();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isDirty, title, content, save]);

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

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="tile-drag-handle flex items-center justify-between px-3 py-2 bg-surface-3 border-b border-surface-4 cursor-move">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIsDirty(true);
          }}
          className="bg-transparent text-sm font-medium text-zinc-200 focus:outline-none flex-1 mr-2"
          placeholder="Note title..."
        />
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
    </>
  );
}
