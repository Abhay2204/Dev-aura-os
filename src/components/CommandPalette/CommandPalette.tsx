import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSystemStore } from '../../store/systemStore';
import { useWindowStore } from '../../store/windowStore';
import type { AppType } from '../../types/window.types';

interface CmdItem {
  id: string;
  icon: string;
  label: string;
  desc?: string;
  category: string;
  shortcut?: string;
  cliCmd?: string;
  action: () => void;
}

const ASCII_LOGO = `
  ██████╗ ███████╗██╗   ██╗
  ██╔══██╗██╔════╝██║   ██║
  ██║  ██║█████╗  ██║   ██║
  ██║  ██║██╔══╝  ╚██╗ ██╔╝
  ██████╔╝███████╗ ╚████╔╝ 
  ╚═════╝ ╚══════╝  ╚═══╝  
    ████████╗ ██████╗ 
      ██╔══╝██╔════╝ 
      ██║   ██║      
      ██║   ██║  ███╗
      ██║   ╚██████╔╝
      ╚═╝    ╚═════╝ 
  AURA OS // DEV PLATFORM v2.0
`.trim();

export const CommandPalette: React.FC = () => {
  const { isCmdPaletteOpen, closeCmdPalette } = useSystemStore();
  const { openWindow } = useWindowStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const ALL_COMMANDS: CmdItem[] = [
    // Core Apps
    { id: 'terminal', icon: '▶', label: 'Open Terminal', category: 'Apps', shortcut: 'Ctrl+T', cliCmd: 'devaura open terminal', desc: 'xterm.js shell with WASM runtime support', action: () => { openWindow('terminal'); closeCmdPalette(); } },
    { id: 'editor', icon: '◈', label: 'Open Code Editor', category: 'Apps', shortcut: 'Ctrl+E', cliCmd: 'devaura open editor', desc: 'Monaco Editor (VSCode engine) with VFS & local sync', action: () => { openWindow('editor'); closeCmdPalette(); } },
    { id: 'browser', icon: '◉', label: 'Open Browser', category: 'Apps', shortcut: 'Ctrl+B', cliCmd: 'devaura open browser', desc: 'Sandboxed browser with tab management', action: () => { openWindow('browser'); closeCmdPalette(); } },
    { id: 'ai', icon: '◆', label: 'Open AI Assistant', category: 'Apps', shortcut: 'Ctrl+/', cliCmd: 'devaura open ai', desc: 'Gemini 2.0 Flash · Workspace-context aware · File write', action: () => { openWindow('ai'); closeCmdPalette(); } },
    { id: 'files', icon: '📁', label: 'Open File Manager', category: 'Apps', cliCmd: 'devaura open filemanager', desc: 'IndexedDB virtual filesystem with grid/list views', action: () => { openWindow('filemanager'); closeCmdPalette(); } },
    { id: 'notes', icon: '◎', label: 'Open Notes', category: 'Apps', cliCmd: 'devaura open notes', desc: 'Markdown notes with auto-save and AI suggestions', action: () => { openWindow('notes'); closeCmdPalette(); } },
    { id: 'apiclient', icon: '⇆', label: 'Open API Client', category: 'Apps', cliCmd: 'devaura open apiclient', desc: 'REST API client — GET/POST/PUT/DELETE with headers & body', action: () => { openWindow('apiclient'); closeCmdPalette(); } },
    { id: 'dbexplorer', icon: '🗄', label: 'Open DB Explorer', category: 'Apps', cliCmd: 'devaura open dbexplorer', desc: 'SQLite WASM — create tables, run queries, export .db', action: () => { openWindow('dbexplorer'); closeCmdPalette(); } },
    // Dev Tools
    { id: 'jsonformatter', icon: '{}', label: 'JSON Formatter', category: 'Dev Tools', cliCmd: 'devaura open jsonformatter', desc: 'Format, minify, validate JSON · Interactive tree explorer', action: () => { openWindow('jsonformatter' as AppType); closeCmdPalette(); } },
    { id: 'regex', icon: '/./', label: 'Regex Playground', category: 'Dev Tools', cliCmd: 'devaura open regex', desc: 'Real-time regex testing with match highlighting & groups', action: () => { openWindow('regex' as AppType); closeCmdPalette(); } },
    { id: 'diffviewer', icon: '±', label: 'Diff Viewer', category: 'Dev Tools', cliCmd: 'devaura open diffviewer', desc: 'Line-by-line text comparison with split/unified view', action: () => { openWindow('diffviewer' as AppType); closeCmdPalette(); } },
    { id: 'devutils', icon: '⚒', label: 'Dev Utils', category: 'Dev Tools', cliCmd: 'devaura open devutils', desc: 'Base64 · URL · JWT · Hash · UUID · Epoch converter', action: () => { openWindow('devutils' as AppType); closeCmdPalette(); } },
    // System
    { id: 'sysmon', icon: '◇', label: 'System Monitor', category: 'System', cliCmd: 'devaura open sysmonitor', desc: 'Real-time CPU, RAM, network metrics and process manager', action: () => { openWindow('sysmonitor'); closeCmdPalette(); } },
    { id: 'settings', icon: '⚙', label: 'Settings', category: 'System', shortcut: 'Ctrl+,', cliCmd: 'devaura open settings', desc: 'Theme, workspace, and Gemini API key configuration', action: () => { openWindow('settings'); closeCmdPalette(); } },
    { id: 'welcome', icon: '⬡', label: 'Welcome Screen', category: 'System', cliCmd: 'devaura open welcome', desc: 'OS overview and quick-start guide', action: () => { openWindow('welcome'); closeCmdPalette(); } },
  ];

  const filtered = query
    ? ALL_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_COMMANDS;

  const selectedCmd = filtered[selected] ?? null;

  // Group by category
  const grouped: { category: string; items: CmdItem[] }[] = [];
  for (const cmd of filtered) {
    const g = grouped.find(g => g.category === cmd.category);
    if (g) g.items.push(cmd);
    else grouped.push({ category: cmd.category, items: [cmd] });
  }

  useEffect(() => {
    if (isCmdPaletteOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCmdPaletteOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { closeCmdPalette(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') { filtered[selected]?.action(); }
    },
    [filtered, selected, closeCmdPalette]
  );

  if (!isCmdPaletteOpen) return null;

  let itemIndex = 0;

  return (
    <div className="cmd-backdrop" onClick={closeCmdPalette}>
      <div className="cmd-hud" onClick={e => e.stopPropagation()}>
        
        {/* HUD Header Bar */}
        <div className="cmd-hud-header">
          <div className="cmd-hud-brackets">
            <span className="cmd-corner tl" />
            <span className="cmd-corner tr" />
          </div>
          <div className="cmd-hud-title-row">
            <span className="cmd-hud-tag">AURA</span>
            <span className="cmd-hud-title">INTEGRATED COMMAND INTERFACE</span>
            <div style={{ flex: 1 }} />
            <span className="cmd-hud-status">
              <span className="cmd-status-dot" />
              WORKSPACE ACTIVE
            </span>
          </div>
        </div>

        <div className="cmd-split-container">
          {/* LEFT PANE — search + results */}
          <div className="cmd-left-pane">
            {/* Input */}
            <div className="cmd-hud-input-row">
              <span className="cmd-prompt-symbol">$</span>
              <span className="cmd-prompt-prefix">devaura run </span>
              <input
                ref={inputRef}
                className="cmd-hud-input"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                placeholder="search commands..."
                autoComplete="off"
                spellCheck={false}
              />
              <span className="cmd-esc-badge">ESC</span>
            </div>

            {/* Results */}
            <div className="cmd-hud-results">
              {filtered.length === 0 && (
                <div className="cmd-no-results">
                  <span className="cmd-no-results-icon">◌</span>
                  <span>No commands match "{query}"</span>
                </div>
              )}
              {grouped.map(group => (
                <div key={group.category}>
                  <div className="cmd-hud-section">{group.category}</div>
                  {group.items.map(cmd => {
                    const currentIndex = itemIndex++;
                    const isSelected = currentIndex === selected;
                    return (
                      <div
                        key={cmd.id}
                        className={`cmd-hud-item ${isSelected ? 'selected' : ''}`}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelected(currentIndex)}
                      >
                        <span className="cmd-hud-item-icon">{cmd.icon}</span>
                        <div className="cmd-hud-item-info">
                          <span className="cmd-hud-item-label">{cmd.label}</span>
                          {cmd.desc && <span className="cmd-hud-item-desc">{cmd.desc}</span>}
                        </div>
                        {cmd.shortcut && <span className="cmd-hud-shortcut">{cmd.shortcut}</span>}
                        {isSelected && <span className="cmd-hud-enter-hint">↵</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANE — metadata */}
          <div className="cmd-right-pane">
            {selectedCmd ? (
              <div className="cmd-detail-panel">
                <div className="cmd-detail-icon-wrap">
                  <span className="cmd-detail-icon">{selectedCmd.icon}</span>
                </div>
                <div className="cmd-detail-label">{selectedCmd.label}</div>
                <div className="cmd-detail-category">{selectedCmd.category.toUpperCase()}</div>
                {selectedCmd.desc && (
                  <div className="cmd-detail-desc">{selectedCmd.desc}</div>
                )}
                {selectedCmd.cliCmd && (
                  <div className="cmd-cli-block">
                    <div className="cmd-cli-header">CLI EQUIVALENT</div>
                    <div className="cmd-cli-code">
                      <span className="cmd-cli-dollar">$</span>
                      <span className="cmd-cli-text">{selectedCmd.cliCmd}</span>
                    </div>
                  </div>
                )}
                {selectedCmd.shortcut && (
                  <div className="cmd-cli-block">
                    <div className="cmd-cli-header">KEYBOARD SHORTCUT</div>
                    <div className="cmd-shortcut-display">{selectedCmd.shortcut}</div>
                  </div>
                )}
                <div className="cmd-detail-action-hint">Press ↵ to execute</div>
              </div>
            ) : (
              <div className="cmd-ascii-panel">
                <pre className="cmd-ascii-art">{ASCII_LOGO}</pre>
                <div className="cmd-ascii-footer">
                  <span>{filtered.length} COMMANDS AVAILABLE</span>
                </div>
              </div>
            )}

            {/* Corner brackets */}
            <span className="cmd-corner br" />
            <span className="cmd-corner bl" />
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="cmd-hud-footer">
          <span>↑↓ navigate</span>
          <span className="cmd-hud-footer-sep">·</span>
          <span>↵ execute</span>
          <span className="cmd-hud-footer-sep">·</span>
          <span>ESC dismiss</span>
          <div style={{ flex: 1 }} />
          <span className="cmd-hud-footer-count">{filtered.length} results</span>
        </div>

      </div>
    </div>
  );
};
