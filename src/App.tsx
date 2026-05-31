import { useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { BootScreen } from './components/Desktop/BootScreen';
import { Desktop } from './components/Desktop/Desktop';
import { Taskbar } from './components/Desktop/Taskbar';
import { WindowManager } from './components/WindowManager/WindowManager';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { useSystemStore } from './store/systemStore';
import { useWindowStore } from './store/windowStore';
import { initFileSystem } from './services/filesystem';

function App() {
  const { booted, settings, setBooted, isCmdPaletteOpen, openCmdPalette, closeCmdPalette } = useSystemStore();
  const { openWindow } = useWindowStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
  }, [settings.theme]);

  const handleBoot = useCallback(async () => {
    await initFileSystem();
    setBooted();
    // Open welcome window after boot
    setTimeout(() => openWindow('welcome'), 100);
  }, [setBooted, openWindow]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'k') {
        e.preventDefault();
        isCmdPaletteOpen ? closeCmdPalette() : openCmdPalette();
      } else if (ctrl && e.key === 't') {
        e.preventDefault();
        openWindow('terminal');
      } else if (ctrl && e.key === 'e') {
        e.preventDefault();
        openWindow('editor');
      } else if (ctrl && e.key === 'b') {
        e.preventDefault();
        openWindow('browser');
      } else if (ctrl && e.key === '/') {
        e.preventDefault();
        openWindow('ai');
      } else if (ctrl && e.key === ',') {
        e.preventDefault();
        openWindow('settings');
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isCmdPaletteOpen, openCmdPalette, closeCmdPalette, openWindow]);

  // Pointer-tracking aura lighting effect
  useEffect(() => {
    if (!booted) return;

    const handlePointerMove = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      // 1. Update interactive elements (buttons, icons, etc.)
      const target = el.closest(
        '.dock-btn, .taskbar-os-btn, .workspace-btn, .tray-item, .btn, .desktop-icon, .fm-item, .fm-sidebar-item, .settings-nav-item, .file-tree-item, .terminal-tab, .browser-tab, .editor-tab, .context-item, .ai-slash-cmd, .wc-btn, .window-action-btn'
      );
      if (target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        target.style.setProperty('--aura-x', `${x.toFixed(1)}%`);
        target.style.setProperty('--aura-y', `${y.toFixed(1)}%`);
      }

      // 2. Update parent window for border aura glow tracking
      const win = el.closest('.os-window');
      if (win instanceof HTMLElement) {
        const rect = win.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        win.style.setProperty('--aura-x', `${x.toFixed(1)}%`);
        win.style.setProperty('--aura-y', `${y.toFixed(1)}%`);
      }

      // 3. Update desktop background container for background aura tracking
      const desktop = document.querySelector('.desktop') as HTMLElement | null;
      if (desktop) {
        const rect = desktop.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        desktop.style.setProperty('--aura-x', `${x.toFixed(1)}%`);
        desktop.style.setProperty('--aura-y', `${y.toFixed(1)}%`);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [booted]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {!booted && <BootScreen onComplete={handleBoot} />}

      {booted && (
        <>
          <Desktop />
          <WindowManager />
          <Taskbar />
          <CommandPalette />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface-2)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                borderRadius: '8px',
              },
              success: {
                iconTheme: { primary: '#00ff88', secondary: 'var(--void)' },
              },
              error: {
                iconTheme: { primary: '#ff4b4b', secondary: 'var(--void)' },
              },
            }}
          />
        </>
      )}
    </div>
  );
}

export default App;
