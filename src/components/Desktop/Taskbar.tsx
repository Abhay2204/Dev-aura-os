import React, { useEffect, useState, useCallback } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useSystemStore } from '../../store/systemStore';
import type { AppType } from '../../types/window.types';
import { APP_DEFINITIONS } from '../../types/window.types';

const CLOCK_UPDATE_INTERVAL = 1000;

const DOCK_APPS: { appType: AppType; label: string; icon: string }[] = [
  { appType: 'terminal', label: 'Terminal', icon: '▶' },
  { appType: 'editor', label: 'Code Editor', icon: '◈' },
  { appType: 'browser', label: 'Browser', icon: '◉' },
  { appType: 'filemanager', label: 'Files', icon: '📁' },
  { appType: 'ai', label: 'AURA AI', icon: '◆' },
  { appType: 'apiclient', label: 'API Client', icon: '⇆' },
  { appType: 'dbexplorer', label: 'DB Explorer', icon: '🗄' },
  { appType: 'jsonformatter', label: 'JSON Formatter', icon: '{}' },
  { appType: 'regex', label: 'Regex Playground', icon: '/./' },
  { appType: 'diffviewer', label: 'Diff Viewer', icon: '±' },
  { appType: 'devutils', label: 'Dev Utils', icon: '⚒' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export const Taskbar: React.FC = () => {
  const {
    windows,
    openWindow,
    focusWindow,
    restoreWindow,
    minimizeWindow,
    activeWorkspace,
    setActiveWorkspace,
  } = useWindowStore();
  const { openCmdPalette, settings, updateSettings } = useSystemStore();
  const [now, setNow] = useState(new Date());
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(80);
  const [brightness, setBrightness] = useState(90);
  const [cpuUsage, setCpuUsage] = useState(21);
  const [ramUsage, setRamUsage] = useState(57);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_UPDATE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isQuickSettingsOpen) return;
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 15) + 10);
      setRamUsage(Math.floor(Math.random() * 4) + 54);
    }, 2000);
    return () => clearInterval(interval);
  }, [isQuickSettingsOpen]);

  const handleAppClick = useCallback(
    (appType: AppType) => {
      // Find window in current workspace first
      const existing = Object.values(windows).find(
        (w) => w.appType === appType && w.workspaceId === activeWorkspace
      );
      if (existing) {
        if (existing.isMinimized) restoreWindow(existing.id);
        else if (existing.isFocused) minimizeWindow(existing.id);
        else focusWindow(existing.id);
      } else {
        openWindow(appType);
      }
    },
    [windows, openWindow, focusWindow, restoreWindow, minimizeWindow, activeWorkspace]
  );

  const runningAppTypes = Array.from(new Set(Object.values(windows).map((w) => w.appType)));
  const pinnedTypes = DOCK_APPS.map((a) => a.appType);

  const otherRunningApps = Object.values(APP_DEFINITIONS)
    .filter((def) => runningAppTypes.includes(def.id) && !pinnedTypes.includes(def.id))
    .map((def) => ({
      appType: def.id,
      label: def.name,
      icon: def.icon,
    }));

  return (
    <div className="taskbar">
      {/* Left spacer to align center container mathematically in the center */}
      <div className="taskbar-left-spacer" />

      {/* Centered Tray holding Start button, Workspaces, and active/pinned Apps */}
      <div className="taskbar-center">
        <button className="taskbar-os-btn" onClick={openCmdPalette} title="Command Palette (Ctrl+K)">
          <span>⬡ AURA</span>
        </button>

        <div className="taskbar-divider" />

        <div className="workspace-switcher">
          {(['main', 'dev', 'build'] as const).map((ws) => (
            <button
              key={ws}
              className={`workspace-btn ${activeWorkspace === ws ? 'active' : ''}`}
              onClick={() => setActiveWorkspace(ws)}
            >
              {ws.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="taskbar-divider" />

        <div className="taskbar-dock">
          {/* Pinned Apps */}
          {DOCK_APPS.map((app) => {
            const workspaceWindows = Object.values(windows).filter(
              (w) => w.appType === app.appType && w.workspaceId === activeWorkspace
            );
            const isRunning = workspaceWindows.length > 0;
            const isFocused = workspaceWindows.some((w) => w.isFocused && !w.isMinimized);

            return (
              <button
                key={app.appType}
                className={`dock-btn ${isFocused ? 'focused' : isRunning ? 'running' : ''}`}
                onClick={() => handleAppClick(app.appType)}
                title={app.label}
              >
                <span className="dock-icon">{app.icon}</span>
                {isRunning && (
                  <span className={`dock-indicator ${isFocused ? 'focused' : ''}`} />
                )}
              </button>
            );
          })}

          {/* Separator for unpinned running apps */}
          {otherRunningApps.length > 0 && <div className="dock-separator" />}

          {/* Unpinned Running Apps */}
          {otherRunningApps.map((app) => {
            const workspaceWindows = Object.values(windows).filter(
              (w) => w.appType === app.appType && w.workspaceId === activeWorkspace
            );
            const isRunning = workspaceWindows.length > 0;
            if (!isRunning) return null; // Only show if running in active workspace
            const isFocused = workspaceWindows.some((w) => w.isFocused && !w.isMinimized);

            return (
              <button
                key={app.appType}
                className={`dock-btn ${isFocused ? 'focused' : 'running'}`}
                onClick={() => handleAppClick(app.appType)}
                title={app.label}
              >
                <span className="dock-icon">{app.icon}</span>
                <span className={`dock-indicator ${isFocused ? 'focused' : ''}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* System Tray & Quick Settings Toggle */}
      <div className="taskbar-tray">
        <button
          className={`tray-item settings-toggle-btn ${isQuickSettingsOpen ? 'active' : ''}`}
          onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
          title="Quick Settings"
        >
          ⚙
        </button>
        <div className="taskbar-divider" />
        <div className="tray-clock">
          <div>{formatTime(now)}</div>
          <div className="tray-date">{formatDate(now)}</div>
        </div>
      </div>

      {/* Quick Settings Control Center Panel */}
      {isQuickSettingsOpen && (
        <div className="quick-settings-panel">
          <div className="qs-header">
            <span>AURA SYSTEM CONTROL</span>
            <button className="qs-close-btn" onClick={() => setIsQuickSettingsOpen(false)}>×</button>
          </div>

          <div className="qs-body">
            {/* System Status Indicators */}
            <div className="qs-status-grid">
              <div className="qs-stat-card">
                <div className="qs-stat-info">
                  <span className="qs-stat-label">CPU</span>
                  <span className="qs-stat-val">{cpuUsage}%</span>
                </div>
                <div className="qs-progress-bar">
                  <div className="qs-progress-fill" style={{ width: `${cpuUsage}%` }} />
                </div>
              </div>
              <div className="qs-stat-card">
                <div className="qs-stat-info">
                  <span className="qs-stat-label">MEMORY</span>
                  <span className="qs-stat-val">{ramUsage}%</span>
                </div>
                <div className="qs-progress-bar">
                  <div className="qs-progress-fill" style={{ width: `${ramUsage}%` }} />
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="qs-section">
              <div className="qs-slider-group">
                <div className="qs-slider-label">
                  <span>🔊 Volume</span>
                  <span>{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="qs-slider"
                />
              </div>
              <div className="qs-slider-group">
                <div className="qs-slider-label">
                  <span>🔆 Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="qs-slider"
                />
              </div>
            </div>

            {/* Settings Toggles */}
            <div className="qs-section">
              <div className="qs-control-row">
                <span>Theme</span>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' })}
                  className="qs-select"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>

              <div className="qs-control-row">
                <span>Active Workspace</span>
                <select
                  value={activeWorkspace}
                  onChange={(e) => setActiveWorkspace(e.target.value)}
                  className="qs-select"
                >
                  <option value="main">Main (Workspace I)</option>
                  <option value="dev">Dev (Workspace II)</option>
                  <option value="build">Build (Workspace III)</option>
                </select>
              </div>
            </div>

            {/* Gemini API Key */}
            <div className="qs-section">
              <div className="qs-slider-label" style={{ marginBottom: '6px' }}>
                <span>Gemini API Key</span>
              </div>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={settings.geminiApiKey}
                onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                className="qs-input"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Taskbar;
