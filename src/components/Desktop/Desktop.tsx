import React, { useCallback, useEffect } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useSystemStore } from '../../store/systemStore';
import type { AppType } from '../../types/window.types';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const DesktopContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose }) => {
  const { openWindow } = useWindowStore();

  const items = [
    { label: 'New Terminal', icon: '▶', action: () => { openWindow('terminal'); onClose(); } },
    { label: 'New Editor', icon: '◈', action: () => { openWindow('editor'); onClose(); } },
    { label: 'Open AI Assistant', icon: '◆', action: () => { openWindow('ai'); onClose(); } },
    { separator: true },
    { label: 'Files', icon: '📁', action: () => { openWindow('filemanager'); onClose(); } },
    { label: 'Browser', icon: '◉', action: () => { openWindow('browser'); onClose(); } },
    { separator: true },
    { label: 'JSON Formatter', icon: '{}', action: () => { openWindow('jsonformatter' as AppType); onClose(); } },
    { label: 'Regex Playground', icon: '/./', action: () => { openWindow('regex' as AppType); onClose(); } },
    { label: 'Diff Viewer', icon: '±', action: () => { openWindow('diffviewer' as AppType); onClose(); } },
    { label: 'Dev Utils', icon: '⚒', action: () => { openWindow('devutils' as AppType); onClose(); } },
    { separator: true },
    { label: 'System Settings', icon: '⚙', action: () => { openWindow('settings'); onClose(); } },
    { label: 'System Monitor', icon: '◇', action: () => { openWindow('sysmonitor'); onClose(); } },
  ];

  return (
    <div
      className="context-menu"
      style={{ left: Math.min(x, window.innerWidth - 200), top: Math.min(y, window.innerHeight - 300) }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="context-sep" />
        ) : (
          <div key={i} className="context-item" onClick={item.action}>
            <span className="ctx-icon">{item.icon}</span>
            {item.label}
          </div>
        )
      )}
    </div>
  );
};

export const Desktop: React.FC = () => {
  const { openWindow } = useWindowStore();
  const { hideContextMenu, contextMenu, showContextMenu } = useSystemStore();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if ((e.target as HTMLElement).closest('.os-window')) return;
      showContextMenu({ x: e.clientX, y: e.clientY, items: [] });
    },
    [showContextMenu]
  );

  const handleClick = useCallback(
    () => {
      if (contextMenu) hideContextMenu();
    },
    [contextMenu, hideContextMenu]
  );

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [hideContextMenu]);

  return (
    <div
      className="desktop"
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      {/* Wallpaper */}
      <div className="desktop-wallpaper">
        <div className="wallpaper-grid" />
        <div className="wallpaper-radial-1" />
        <div className="wallpaper-radial-2" />
        <div className="wallpaper-scanlines" />
      </div>

      {/* Desktop Icons */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1 }}>
        {[
          { icon: '◎', label: 'Welcome', app: 'welcome' as AppType },
          { icon: '◈', label: 'README.md', app: 'editor' as AppType },
          { icon: '◆', label: 'AURA AI', app: 'ai' as AppType },
        ].map((item) => (
          <div
            key={item.label}
            onDoubleClick={() => openWindow(item.app)}
            className="desktop-icon"
          >
            <span className="desktop-icon-symbol">{item.icon}</span>
            <span className="desktop-icon-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <DesktopContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={hideContextMenu}
        />
      )}
    </div>
  );
};

export default Desktop;
