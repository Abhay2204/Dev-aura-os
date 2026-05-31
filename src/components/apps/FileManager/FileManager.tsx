import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { listDirectory, createDirectory, writeFile, getFileIcon, initFileSystem, type FSEntry } from '../../../services/filesystem';

export const FileManagerApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const [currentPath, setCurrentPath] = useState('home');
  const [entries, setEntries] = useState<FSEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const load = useCallback(async (parentId: string) => {
    setLoading(true);
    try {
      await initFileSystem();
      const items = await listDirectory(parentId);
      setEntries(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(currentPath);
  }, [currentPath, load]);

  const handleOpen = (entry: FSEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(entry.id);
      setSelected(null);
    } else {
      setSelected(entry.id);
    }
  };

  const pathParts = [
    { id: 'root', label: '/' },
    { id: 'home', label: 'home' },
    ...(currentPath !== 'root' && currentPath !== 'home'
      ? [{ id: currentPath, label: entries[0]?.parentId === currentPath ? '...' : currentPath }]
      : []),
  ];

  const handleNewFolder = async () => {
    const name = prompt('Folder name:');
    if (!name) return;
    try {
      await createDirectory(currentPath, name);
      toast.success(`Folder "${name}" created`);
      load(currentPath);
    } catch (e: any) {
      toast.error(`Failed to create folder: ${e.message || e}`);
    }
  };

  const handleNewFile = async () => {
    const name = prompt('File name:');
    if (!name) return;
    try {
      await writeFile(currentPath, name, '');
      toast.success(`File "${name}" created`);
      load(currentPath);
    } catch (e: any) {
      toast.error(`Failed to create file: ${e.message || e}`);
    }
  };

  const SIDEBAR_ITEMS = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'projects', label: 'Projects', icon: '📦' },
    { id: 'documents', label: 'Documents', icon: '📁' },
    { id: 'downloads', label: 'Downloads', icon: '⬇' },
  ];

  return (
    <div className="filemanager-window">
      {/* Sidebar */}
      <div className="filemanager-sidebar">
        <div style={{ padding: '8px 4px 4px', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Locations
        </div>
        {SIDEBAR_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`fm-sidebar-item ${currentPath === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPath(item.id)}
          >
            <span className="fm-sidebar-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="filemanager-main">
        {/* Toolbar */}
        <div className="filemanager-toolbar">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setCurrentPath('home')}
            style={{ fontSize: 14 }}
          >
            ←
          </button>
          <div className="fm-path-bar">
            {pathParts.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <span className="fm-path-sep">/</span>}
                <span className="fm-path-seg" onClick={() => setCurrentPath(p.id)}>
                  {p.label}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-icon" onClick={handleNewFolder} data-tooltip="New Folder">
              📁+
            </button>
            <button className="btn btn-ghost btn-icon" onClick={handleNewFile} data-tooltip="New File">
              📄+
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
              data-tooltip="Toggle View"
            >
              {view === 'grid' ? '☰' : '⊞'}
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : view === 'grid' ? (
          <div className="filemanager-grid">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`fm-item ${selected === entry.id ? 'selected' : ''}`}
                onClick={() => setSelected(entry.id)}
                onDoubleClick={() => handleOpen(entry)}
              >
                <span className="fm-item-icon">{getFileIcon(entry)}</span>
                <span className="fm-item-name">{entry.name}</span>
              </div>
            ))}
            {entries.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 32, fontSize: 12 }}>
                This folder is empty.<br />
                <span style={{ color: 'var(--cyan)', cursor: 'pointer' }} onClick={handleNewFile}>Create a file</span> or{' '}
                <span style={{ color: 'var(--cyan)', cursor: 'pointer' }} onClick={handleNewFolder}>new folder</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: selected === entry.id ? 'var(--cyan-dim)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onClick={() => setSelected(entry.id)}
                onDoubleClick={() => handleOpen(entry)}
              >
                <span>{getFileIcon(entry)}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{entry.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {entry.type === 'file' ? `${entry.size}B` : 'Folder'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {new Date(entry.modifiedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
