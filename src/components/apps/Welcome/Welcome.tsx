import React from 'react';
import { useWindowStore } from '../../../store/windowStore';
import type { AppType } from '../../../types/window.types';

const FEATURES = [
  { icon: '▶', title: 'Terminal', desc: 'xterm.js shell with command history, ANSI colors, and multi-tabs', app: 'terminal' as AppType },
  { icon: '◈', title: 'Code Editor', desc: 'Monaco Editor (VS Code engine) with syntax highlighting and VFS storage', app: 'editor' as AppType },
  { icon: '◉', title: 'Browser', desc: 'Built-in browser with tabs, address bar, and quick links', app: 'browser' as AppType },
  { icon: '◆', title: 'AI Assistant', desc: 'Gemini 2.0 powered co-developer with workspace context', app: 'ai' as AppType },
  { icon: '📁', title: 'File Manager', desc: 'IndexedDB-backed file system with grid and list views', app: 'filemanager' as AppType },
  { icon: '◇', title: 'System Monitor', desc: 'Real-time CPU, RAM, network metrics and process list', app: 'sysmonitor' as AppType },
];

export const WelcomeApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const { openWindow } = useWindowStore();

  return (
    <div
      style={{
        padding: '24px',
        background: 'var(--abyss)',
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8, color: 'var(--text-primary)' }}>⬡</div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            letterSpacing: 6,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}
        >
          DEV AURA OS
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2 }}>
          CODE. BUILD. SHIP. THINK.
        </p>
      </div>

      {/* Welcome Text */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}
      >
        Welcome to <strong style={{ color: 'var(--text-primary)' }}>DEV AURA OS</strong> — the web-native developer desktop workspace.
        Your browser, terminal, editor, AI, and file system — unified in one powerful environment.
        <br /><br />
        <strong>Press</strong> <kbd style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-code)', fontSize: 11, color: 'var(--text-primary)' }}>Ctrl+K</kbd> to open the Command Palette and access everything instantly.
      </div>

      {/* App Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FEATURES.map((f) => (
          <div
            key={f.title}
            onClick={() => openWindow(f.app)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-secondary)';
              e.currentTarget.style.background = 'var(--surface-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--surface)';
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1, color: 'var(--text-primary)' }}>{f.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tip */}
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: 11,
          color: 'var(--text-secondary)',
          display: 'flex',
          gap: 8,
        }}
      >
        <span>◆</span>
        <span>
          <strong>AI Tip:</strong> Set your Gemini API key in{' '}
          <span
            style={{ textDecoration: 'underline', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600 }}
            onClick={() => openWindow('settings')}
          >
            Settings → AI
          </span>{' '}
          to unlock the full AI co-developer experience.
        </span>
      </div>

      {/* Right-click tip */}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
        Right-click the desktop for quick actions · Double-click icons to open apps
      </div>
    </div>
  );
};

export default WelcomeApp;
