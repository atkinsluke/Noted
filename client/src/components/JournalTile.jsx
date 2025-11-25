import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchJournalEntry, updateJournalEntry } from '../api';

export default function JournalTile({ date, onClose }) {
  const [currentDate, setCurrentDate] = useState(date);
  const [entry, setEntry] = useState(null);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const moods = ['😊', '😐', '😔', '😤', '🤔', '😴', '🎉', '💪'];

  useEffect(() => {
    fetchJournalEntry(currentDate).then((data) => {
      setEntry(data);
      setContent(data.content || '');
      setMood(data.mood || '');
    });
  }, [currentDate]);

  const save = useCallback(async () => {
    if (!isDirty) return;
    
    setIsSaving(true);
    await updateJournalEntry(currentDate, { content, mood });
    setIsDirty(false);
    setIsSaving(false);
  }, [currentDate, content, mood, isDirty]);

  // Auto-save
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setTimeout(() => {
      save();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isDirty, content, mood, save]);

  const navigateDay = (direction) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + direction);
    setCurrentDate(d.toISOString().split('T')[0]);
    setIsDirty(false);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isToday = currentDate === new Date().toISOString().split('T')[0];

  if (!entry) {
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDay(-1)}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-zinc-200">
            {formatDate(currentDate)}
            {isToday && (
              <span className="ml-2 text-xs text-emerald-500">(Today)</span>
            )}
          </span>
          <button
            onClick={() => navigateDay(1)}
            className="text-zinc-500 hover:text-zinc-300 p-1"
            disabled={isToday}
          >
            <ChevronRight size={16} className={isToday ? 'opacity-30' : ''} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {isDirty && <span className="text-xs text-zinc-500 mr-2">Unsaved</span>}
          {isSaving && <span className="text-xs text-amber-500 mr-2">Saving...</span>}
          {!isDirty && !isSaving && entry.content && (
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

      {/* Mood selector */}
      <div className="px-4 py-2 border-b border-surface-4 flex items-center gap-2">
        <span className="text-xs text-zinc-500 mr-2">Mood:</span>
        {moods.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMood(m);
              setIsDirty(true);
            }}
            className={`text-lg hover:scale-125 transition-transform ${
              mood === m ? 'scale-125' : 'opacity-50 hover:opacity-100'
            }`}
          >
            {m}
          </button>
        ))}
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
          placeholder="How was your day?"
        />
      </div>
    </>
  );
}
