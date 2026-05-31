import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../store/windowStore';
import { TerminalApp } from '../apps/Terminal/Terminal';
import { EditorApp } from '../apps/CodeEditor/Editor';
import { BrowserApp } from '../apps/Browser/Browser';
import { FileManagerApp } from '../apps/FileManager/FileManager';
import { AIAssistantApp } from '../apps/AIAssistant/AIAssistant';
import { SettingsApp } from '../apps/Settings/Settings';
import { SystemMonitorApp } from '../apps/SystemMonitor/SystemMonitor';
import { NotesApp } from '../apps/Notes/Notes';
import { WelcomeApp } from '../apps/Welcome/Welcome';
import { APIClientApp } from '../apps/APIClient/APIClient';
import { DBExplorerApp } from '../apps/DBExplorer/DBExplorer';
import { JSONFormatterApp } from '../apps/JSONFormatter/JSONFormatter';
import { RegexTesterApp } from '../apps/RegexTester/RegexTester';
import { DiffViewerApp } from '../apps/DiffViewer/DiffViewer';
import { DevUtilsApp } from '../apps/DevUtils/DevUtils';
import type { WindowState } from '../../types/window.types';

const APP_COMPONENTS: Record<string, React.ComponentType<{ windowId: string; appProps?: Record<string, unknown> }>> = {
  terminal: TerminalApp,
  editor: EditorApp,
  browser: BrowserApp,
  filemanager: FileManagerApp,
  ai: AIAssistantApp,
  settings: SettingsApp,
  sysmonitor: SystemMonitorApp,
  notes: NotesApp,
  welcome: WelcomeApp,
  apiclient: APIClientApp,
  dbexplorer: DBExplorerApp,
  jsonformatter: JSONFormatterApp,
  regex: RegexTesterApp,
  diffviewer: DiffViewerApp,
  devutils: DevUtilsApp,
};

const OSWindow: React.FC<{ win: WindowState }> = React.memo(({ win }) => {
  const { closeWindow, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, updateWindowPosition, updateWindowSize } = useWindowStore();

  const AppComponent = APP_COMPONENTS[win.appType];

  // Local state to keep track of geometric position and size during active dragging/resizing.
  // This prevents store updates from triggering expensive application re-renders on every frame.
  const [coords, setCoords] = React.useState({ x: win.x, y: win.y });
  const [dimensions, setDimensions] = React.useState({ width: win.width, height: win.height });
  const [snapPreview, setSnapPreview] = React.useState<'left' | 'right' | 'top' | null>(null);

  // Sync with store updates (such as maximize, restore, cascade, initialization)
  React.useEffect(() => {
    setCoords({ x: win.x, y: win.y });
    setDimensions({ width: win.width, height: win.height });
  }, [win.x, win.y, win.width, win.height]);

  // Memoize the inner app body. Since AppComponent only depends on win.id and win.appProps,
  // it will NOT re-render during dragging/resizing, making movement extremely performant.
  const memoizedApp = React.useMemo(() => {
    return AppComponent ? <AppComponent windowId={win.id} appProps={win.appProps} /> : null;
  }, [AppComponent, win.id, win.appProps]);

  const handleDrag = useCallback(
    (e: unknown, d: { x: number; y: number }) => {
      setCoords({ x: d.x, y: d.y });
      const ev = e as any;
      const clientX = ev?.clientX || ev?.touches?.[0]?.clientX;
      const clientY = ev?.clientY || ev?.touches?.[0]?.clientY;

      if (clientX !== undefined && clientY !== undefined) {
        if (clientX < 20) {
          setSnapPreview('left');
        } else if (clientX > window.innerWidth - 20) {
          setSnapPreview('right');
        } else if (clientY < 20) {
          setSnapPreview('top');
        } else {
          setSnapPreview(null);
        }
      }
    },
    []
  );

  const handleDragStop = useCallback(
    (e: unknown, d: { x: number; y: number }) => {
      const ev = e as any;
      const clientX = ev?.clientX || ev?.touches?.[0]?.clientX;
      const clientY = ev?.clientY || ev?.touches?.[0]?.clientY;
      const taskbarHeight = 52;

      setSnapPreview(null);

      if (clientX !== undefined && clientY !== undefined) {
        if (clientX < 20) {
          updateWindowPosition(win.id, 0, 0);
          updateWindowSize(win.id, window.innerWidth / 2, window.innerHeight - taskbarHeight);
        } else if (clientX > window.innerWidth - 20) {
          updateWindowPosition(win.id, window.innerWidth / 2, 0);
          updateWindowSize(win.id, window.innerWidth / 2, window.innerHeight - taskbarHeight);
        } else if (clientY < 20) {
          maximizeWindow(win.id);
        } else {
          updateWindowPosition(win.id, d.x, d.y);
        }
      } else {
        updateWindowPosition(win.id, d.x, d.y);
      }
    },
    [win.id, updateWindowPosition, updateWindowSize, maximizeWindow]
  );

  const handleResize = useCallback(
    (_e: unknown, _dir: unknown, ref: HTMLElement, _delta: unknown, pos: { x: number; y: number }) => {
      setDimensions({ width: parseInt(ref.style.width), height: parseInt(ref.style.height) });
      setCoords({ x: pos.x, y: pos.y });
    },
    []
  );

  const handleResizeStop = useCallback(
    (_e: unknown, _dir: unknown, ref: HTMLElement, _delta: unknown, pos: { x: number; y: number }) => {
      updateWindowSize(win.id, parseInt(ref.style.width), parseInt(ref.style.height));
      updateWindowPosition(win.id, pos.x, pos.y);
    },
    [win.id, updateWindowSize, updateWindowPosition]
  );

  if (win.isMinimized) return null;

  const isMaximized = win.isMaximized;
  const taskbarH = 52;

  return (
    <AnimatePresence>
      <motion.div
        key={win.id}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 5 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: win.zIndex,
          pointerEvents: 'none',
        }}
      >
        {snapPreview && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: snapPreview === 'left' ? 0 : snapPreview === 'right' ? '50%' : 0,
              width: snapPreview === 'top' ? '100%' : '50%',
              height: `calc(100vh - ${taskbarH}px)`,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '2px dashed var(--text-primary)',
              boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
              zIndex: 99999,
            }}
          />
        )}
        {isMaximized ? (
          <div
            className={`os-window ${win.isFocused ? 'focused' : ''}`}
            style={{ width: '100%', height: `calc(100% - ${taskbarH}px)`, borderRadius: 0, pointerEvents: 'auto' }}
            onMouseDown={() => focusWindow(win.id)}
          >
            <WindowTitleBar win={win} onClose={() => closeWindow(win.id)} onMin={() => minimizeWindow(win.id)} onMax={() => restoreWindow(win.id)} />
            <div className="window-body">
              {memoizedApp}
            </div>
          </div>
        ) : (
          <Rnd
            position={coords}
            size={dimensions}
            onDragStart={() => document.body.classList.add('dragging')}
            onDrag={handleDrag}
            onDragStop={(e, d) => {
              document.body.classList.remove('dragging');
              handleDragStop(e, d);
            }}
            onResizeStart={() => document.body.classList.add('resizing')}
            onResize={handleResize}
            onResizeStop={(e, dir, ref, delta, pos) => {
              document.body.classList.remove('resizing');
              handleResizeStop(e, dir, ref, delta, pos);
            }}
            dragHandleClassName="window-titlebar"
            cancel=".window-controls, .wc-btn, .wc-min, .wc-max, .wc-close"
            bounds="parent"
            minWidth={300}
            minHeight={200}
            style={{ zIndex: win.zIndex, pointerEvents: 'auto' }}
            onMouseDown={() => focusWindow(win.id)}
            enableResizing={{
              bottom: true, bottomRight: true, right: true,
              bottomLeft: true, left: true, top: true,
              topRight: true, topLeft: true,
            }}
          >
            <div
              className={`os-window ${win.isFocused ? 'focused' : ''}`}
              style={{ width: '100%', height: '100%' }}
            >
              <WindowTitleBar
                win={win}
                onClose={() => closeWindow(win.id)}
                onMin={() => minimizeWindow(win.id)}
                onMax={() => maximizeWindow(win.id)}
              />
              <div className="window-body">
                {memoizedApp}
              </div>
            </div>
          </Rnd>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

OSWindow.displayName = 'OSWindow';

const WindowTitleBar: React.FC<{
  win: WindowState;
  onClose: () => void;
  onMin: () => void;
  onMax: () => void;
}> = ({ win, onClose, onMin, onMax }) => (
  <div className="window-titlebar">
    <div className="window-app-icon">{win.icon}</div>
    <div className="window-title">{win.title}</div>
    <div
      className="window-controls"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <button className="wc-btn wc-min" onClick={(e) => { e.stopPropagation(); onMin(); }} title="Minimize">—</button>
      <button className="wc-btn wc-max" onClick={(e) => { e.stopPropagation(); onMax(); }} title={win.isMaximized ? 'Restore' : 'Maximize'}>□</button>
      <button className="wc-btn wc-close" onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close">×</button>
    </div>
  </div>
);

export const WindowManager: React.FC = () => {
  const { windows, activeWorkspace } = useWindowStore();
  const windowList = Object.values(windows)
    .filter((win) => win.workspaceId === activeWorkspace)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="window-layer">
      {windowList.map((win) => (
        <OSWindow key={win.id} win={win} />
      ))}
    </div>
  );
};

export default WindowManager;
