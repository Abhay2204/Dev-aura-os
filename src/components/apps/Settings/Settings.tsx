import React, { useState } from 'react';
import { useSystemStore } from '../../../store/systemStore';

const SECTIONS = ['AI', 'Appearance', 'System', 'Shortcuts', 'About'];

const SHORTCUTS = [
  { action: 'Command Palette', shortcut: 'Ctrl+K' },
  { action: 'New Terminal', shortcut: 'Ctrl+T' },
  { action: 'New Editor', shortcut: 'Ctrl+E' },
  { action: 'New Browser', shortcut: 'Ctrl+B' },
  { action: 'AI Assistant', shortcut: 'Ctrl+/' },
  { action: 'Close Window', shortcut: 'Ctrl+W' },
  { action: 'Minimize Window', shortcut: 'Ctrl+M' },
  { action: 'Maximize Window', shortcut: 'Ctrl+X' },
];

export const SettingsApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const { settings, updateSettings } = useSystemStore();
  const [activeSection, setActiveSection] = useState('AI');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  return (
    <div className="settings-window">
      <div className="settings-sidebar">
        <div style={{ padding: '10px 12px 6px', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Settings
        </div>
        {SECTIONS.map((s) => (
          <div
            key={s}
            className={`settings-nav-item ${activeSection === s ? 'active' : ''}`}
            onClick={() => setActiveSection(s)}
          >
            <span>
              {s === 'AI' ? '◆' : s === 'Appearance' ? '◈' : s === 'System' ? '⚙' : s === 'Shortcuts' ? '⌨' : '⬡'}
            </span>
            {s}
          </div>
        ))}
      </div>

      <div className="settings-content">
        {activeSection === 'AI' && (
          <div className="settings-section">
            <div className="settings-section-title">AI Configuration</div>

            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Gemini API Key</div>
                <div className="settings-row-desc">
                  Required for AI features.{' '}
                  <a
                    href="https://aistudio.google.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Get a free key →
                  </a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className="settings-input"
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={settings.geminiApiKey}
                  onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                  placeholder="AIza..."
                  style={{ minWidth: 260 }}
                />
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => setApiKeyVisible((v) => !v)}
                  style={{ fontSize: 12 }}
                >
                  {apiKeyVisible ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">AI Model</div>
                <div className="settings-row-desc">Gemini 2.0 Flash is recommended for fast code assistance.</div>
              </div>
              <select
                className="settings-input"
                style={{ minWidth: 200 }}
                defaultValue="gemini-2.0-flash"
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Powerful)</option>
              </select>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              {settings.geminiApiKey && settings.geminiApiKey !== 'your_gemini_api_key_here'
                ? '✓ API key configured — AI assistant is active'
                : '⚠ No API key — Enter your Gemini API key above to enable AI features'}
            </div>
          </div>
        )}

        {activeSection === 'Appearance' && (
          <div className="settings-section">
            <div className="settings-section-title">Appearance</div>

            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">System Theme</div>
                <div className="settings-row-desc">Choose between monochrome themes</div>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' })}
                className="settings-input"
                style={{ minWidth: 200 }}
              >
                <option value="light">Monochrome Light</option>
                <option value="dark">Monochrome Dark</option>
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Username</div>
                <div className="settings-row-desc">Used in terminal prompts and shell logs</div>
              </div>
              <input
                className="settings-input"
                value={settings.username}
                onChange={(e) => updateSettings({ username: e.target.value })}
                placeholder="developer"
              />
            </div>

            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Animations</div>
                <div className="settings-row-desc">Enable smooth workspace transitions and window scaling</div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: settings.animationsEnabled ? 'var(--text-primary)' : 'var(--surface-3)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
                onClick={() => updateSettings({ animationsEnabled: !settings.animationsEnabled })}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: settings.animationsEnabled ? 20 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'System' && (
          <div className="settings-section">
            <div className="settings-section-title">System</div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">OS Version</div>
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>
                DEV AURA OS v1.0.0
              </span>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Kernel</div>
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>
                WebKernel/wasm32
              </span>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Browser</div>
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text-muted)', maxWidth: 260, textAlign: 'right' }}>
                {navigator.userAgent.split(' ').slice(-2).join(' ')}
              </span>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">Display</div>
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--text-muted)' }}>
                {window.innerWidth}×{window.innerHeight} px
              </span>
            </div>
          </div>
        )}

        {activeSection === 'Shortcuts' && (
          <div className="settings-section">
            <div className="settings-section-title">Keyboard Shortcuts</div>
            {SHORTCUTS.map((s) => (
              <div key={s.action} className="settings-row">
                <div className="settings-row-label">{s.action}</div>
                <kbd
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontFamily: 'var(--font-code)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {s.shortcut}
                </kbd>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'About' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: 'var(--text-primary)' }}>⬡</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 4, color: 'var(--text-primary)' }}>
              DEV AURA OS
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>Version 1.0.0 · Developer Preview</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.7 }}>
              The operating system for builders.<br />
              CODE. BUILD. SHIP. THINK.
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              Built with React 19 · xterm.js · Monaco Editor<br />
              Gemini AI · Zustand · Vite 6 · IndexedDB
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsApp;
