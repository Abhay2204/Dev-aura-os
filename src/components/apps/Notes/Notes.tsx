import React, { useState } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const DEFAULT_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'DEV AURA OS Notes',
    content: `# Welcome to Notes\n\nThis is your markdown-first note editor.\n\n## Features\n- Markdown support\n- Auto-save\n- AI-powered (ask AURA to expand or summarize)\n\n## Ideas\n- [ ] Build a REST API\n- [ ] Refactor the auth module\n- [ ] Write tests for the payment service\n- [x] Set up DEV AURA OS`,
    updatedAt: Date.now(),
  },
  {
    id: 'n2',
    title: 'Architecture Notes',
    content: `# System Architecture\n\n## Frontend\n- React 19 + TypeScript\n- Zustand for state\n- Vite 6 build\n\n## AI Layer\n- Gemini 2.0 Flash\n- Workspace context injection\n- Streaming responses\n\n## Storage\n- IndexedDB for files\n- OPFS for large assets\n- LocalStorage for settings`,
    updatedAt: Date.now() - 3600000,
  },
];

let noteIdCounter = 100;

export const NotesApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [notes, setNotes] = useState<Note[]>(DEFAULT_NOTES);
  const [activeNote, setActiveNote] = useState<string>('n1');
  const [isDirty, setIsDirty] = useState(false);

  const currentNote = notes.find((n) => n.id === activeNote);

  const updateNote = (field: 'title' | 'content', value: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote ? { ...n, [field]: value, updatedAt: Date.now() } : n
      )
    );
    setIsDirty(true);
    setTimeout(() => setIsDirty(false), 2000);
  };

  const createNote = () => {
    const newNote: Note = {
      id: `n${++noteIdCounter}`,
      title: 'Untitled Note',
      content: '',
      updatedAt: Date.now(),
    };
    setNotes((prev) => [...prev, newNote]);
    setActiveNote(newNote.id);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote === id) setActiveNote(notes[0]?.id || '');
  };

  return (
    <div className="notes-window">
      {/* Sidebar */}
      <div className="notes-sidebar">
        <div className="notes-toolbar">
          <button className="btn btn-primary" style={{ flex: 1, fontSize: 11 }} onClick={createNote}>
            + New Note
          </button>
        </div>
        <div className="notes-list">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${note.id === activeNote ? 'active' : ''}`}
              onClick={() => setActiveNote(note.id)}
            >
              <div className="note-item-title">{note.title || 'Untitled'}</div>
              <div className="note-item-preview">
                {note.content.replace(/[#*`\[\]]/g, '').slice(0, 50)}...
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      {currentNote ? (
        <div className="notes-editor">
          <div className="notes-editor-header">
            <input
              className="notes-title-input"
              value={currentNote.title}
              onChange={(e) => updateNote('title', e.target.value)}
              placeholder="Note title..."
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {isDirty ? 'Saving...' : `Saved ${new Date(currentNote.updatedAt).toLocaleTimeString()}`}
              </span>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: '2px 8px', marginLeft: 'auto' }}
                onClick={() => deleteNote(currentNote.id)}
              >
                Delete
              </button>
            </div>
          </div>
          <textarea
            className="notes-content-input"
            value={currentNote.content}
            onChange={(e) => updateNote('content', e.target.value)}
            placeholder="Start writing... Markdown supported"
            spellCheck={false}
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 13,
          }}
        >
          Select a note or create a new one
        </div>
      )}
    </div>
  );
};
