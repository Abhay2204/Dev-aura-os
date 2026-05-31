import React, { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import { openDB } from 'idb';
import { useSystemStore } from '../../../store/systemStore';
import { useWindowStore } from '../../../store/windowStore';
import {
  getAllEntries,
  readFile,
  writeFile,
  createDirectory,
  updateFileContent,
  getFileIcon,
} from '../../../services/filesystem';
import type { FSEntry } from '../../../services/filesystem';

interface EditorTab {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

interface FlatTreeItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  parentId: string | null;
  indent: number;
  isExpanded?: boolean;
}

function detectLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', md: 'markdown',
    json: 'json', yaml: 'yaml', yml: 'yaml', css: 'css',
    html: 'html', sh: 'shell', toml: 'toml', xml: 'xml',
  };
  return map[ext || ''] || 'plaintext';
}

const buildFlatTree = (
  entries: FSEntry[],
  parentId: string | null,
  indent: number,
  expandedDirs: Record<string, boolean>,
  result: FlatTreeItem[] = []
): FlatTreeItem[] => {
  const children = entries.filter((e) => e.parentId === parentId);
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const child of children) {
    const isExpanded = !!expandedDirs[child.id];
    result.push({
      id: child.id,
      name: child.name,
      type: child.type,
      parentId: child.parentId,
      indent,
      isExpanded,
    });
    if (child.type === 'directory' && isExpanded) {
      buildFlatTree(entries, child.id, indent + 1, expandedDirs, result);
    }
  }
  return result;
};

export const EditorApp: React.FC<{ windowId: string; appProps?: Record<string, unknown> }> = () => {
  const { settings, setActiveFile } = useSystemStore();
  const { openWindow } = useWindowStore();
  const [entries, setEntries] = useState<FSEntry[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({ root: true });
  const [selectedDirId, setSelectedDirId] = useState<string>('root');
  const [dirHandle, setDirHandle] = useState<any>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dirHandleRef = useRef<any>(null);
  dirHandleRef.current = dirHandle;
  const tabsRef = useRef<EditorTab[]>([]);
  tabsRef.current = tabs;
  const activeTabRef = useRef<number>(0);
  activeTabRef.current = activeTab;

  const currentTab = tabs[activeTab];

  // Sync active file to SystemStore for AI workspace context
  useEffect(() => {
    if (currentTab) {
      setActiveFile(currentTab.id, currentTab.content);
    } else {
      setActiveFile(null, '');
    }
  }, [currentTab, setActiveFile]);

  const readDirectoryHandle = async (handle: any, parentId: string = 'root'): Promise<FSEntry[]> => {
    const result: FSEntry[] = [];
    const now = Date.now();
    for await (const entry of handle.values()) {
      const id = parentId === 'root' ? entry.name : `${parentId}/${entry.name}`;
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const content = await file.text();
        result.push({
          id,
          name: entry.name,
          type: 'file',
          parentId,
          content,
          size: file.size,
          createdAt: now,
          modifiedAt: file.lastModified,
          mimeType: 'text/plain'
        });
      } else if (entry.kind === 'directory') {
        result.push({
          id,
          name: entry.name,
          type: 'directory',
          parentId,
          content: '',
          size: 0,
          createdAt: now,
          modifiedAt: now
        });
        const children = await readDirectoryHandle(entry, id);
        result.push(...children);
      }
    }
    return result;
  };

  const saveFileToHandle = async (path: string, content: string) => {
    if (!dirHandleRef.current) return;
    const parts = path.split('/');
    let current = dirHandleRef.current;
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  };

  const createEntryInHandle = async (parentPath: string, name: string, type: 'file' | 'directory') => {
    if (!dirHandleRef.current) return;
    const parts = parentPath.split('/').filter(p => p !== 'root');
    let current = dirHandleRef.current;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part);
    }
    if (type === 'file') {
      const fileHandle = await current.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('');
      await writable.close();
    } else {
      await current.getDirectoryHandle(name, { create: true });
    }
  };

  const refreshTree = useCallback(async () => {
    if (dirHandle) {
      try {
        const localEntries = await readDirectoryHandle(dirHandle, 'root');
        setEntries(localEntries);
      } catch (e) {
        console.error('Error scanning folder:', e);
      }
    } else {
      const all = await getAllEntries();
      setEntries(all);
    }
  }, [dirHandle]);

  const syncLocalEntriesToIndexedDB = async (localEntries: FSEntry[]) => {
    try {
      const db = await openDB('devaura-fs', 1);
      const tx = db.transaction('entries', 'readwrite');
      const store = tx.store;
      const keys = await store.getAllKeys();
      for (const key of keys) {
        if (key !== 'root') {
          await store.delete(key);
        }
      }
      for (const entry of localEntries) {
        await store.put(entry);
      }
      await tx.done;
    } catch (e) {
      console.error('Error syncing local entries to IndexedDB:', e);
    }
  };

  const handleSyncFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert('File System Access API is not supported on this browser. Try Chrome or Edge.');
        return;
      }
      const handle = await (window as any).showDirectoryPicker();
      setDirHandle(handle);
      setExpandedDirs({ root: true });
      setSelectedDirId('root');
      
      const localEntries = await readDirectoryHandle(handle, 'root');
      setEntries(localEntries);
      await syncLocalEntriesToIndexedDB(localEntries);
      
      const readme = localEntries.find(e => e.name.toLowerCase() === 'readme.md');
      if (readme) {
        setTabs([{
          id: readme.id,
          name: readme.name,
          content: readme.content,
          language: detectLanguage(readme.name),
          isDirty: false
        }]);
        setActiveTab(0);
      } else {
        const firstFile = localEntries.find(e => e.type === 'file');
        if (firstFile) {
          setTabs([{
            id: firstFile.id,
            name: firstFile.name,
            content: firstFile.content,
            language: detectLanguage(firstFile.name),
            isDirty: false
          }]);
          setActiveTab(0);
        } else {
          setTabs([]);
        }
      }
    } catch (err) {
      console.log('User cancelled or folder sync error:', err);
    }
  };

  // Initialize and load README by default if available
  useEffect(() => {
    refreshTree().then(async () => {
      if (dirHandle) return;
      const all = await getAllEntries();
      const readme = all.find((e) => e.name === 'README.md' && e.type === 'file');
      if (readme) {
        setTabs([
          {
            id: readme.id,
            name: readme.name,
            content: readme.content,
            language: detectLanguage(readme.name),
            isDirty: false,
          },
        ]);
        setActiveTab(0);
      } else {
        const firstFile = all.find((e) => e.type === 'file');
        if (firstFile) {
          setTabs([
            {
              id: firstFile.id,
              name: firstFile.name,
              content: firstFile.content,
              language: detectLanguage(firstFile.name),
              isDirty: false,
            },
          ]);
          setActiveTab(0);
        }
      }
    });
  }, [refreshTree, dirHandle]);

  useEffect(() => {
    const handleVFSChange = () => {
      refreshTree();
    };
    window.addEventListener('vfs-change', handleVFSChange);
    return () => {
      window.removeEventListener('vfs-change', handleVFSChange);
    };
  }, [refreshTree]);

  const openFile = useCallback(async (fileId: string) => {
    let file = entries.find((e) => e.id === fileId && e.type === 'file');
    let content = '';
    let name = '';
    if (!file) {
      const dbFile = await readFile(fileId);
      if (dbFile) {
        content = dbFile.content;
        name = dbFile.name;
      } else {
        return;
      }
    } else {
      name = file.name;
      content = file.content || '';
    }
    
    const existing = tabs.findIndex((t) => t.id === fileId);
    if (existing >= 0) {
      setActiveTab(existing);
    } else {
      const newTab: EditorTab = {
        id: fileId,
        name: name,
        content: content,
        language: detectLanguage(name),
        isDirty: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(tabs.length);
    }
  }, [tabs, entries]);

  const closeTab = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    setTabs((prev) => prev.filter((_, idx) => idx !== i));
    setActiveTab((prev) => Math.min(prev, tabs.length - 2));
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.onDidChangeCursorPosition((e) => {
      setCursorInfo({ line: e.position.lineNumber, col: e.position.column });
    });
    
    editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: (ed) => ed.getAction('editor.action.formatDocument')?.run(),
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const currentTabs = tabsRef.current;
      const currentActive = activeTabRef.current;
      const tab = currentTabs[currentActive];
      if (tab) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        const val = editor.getValue();
        updateFileContent(tab.id, val).then(() => {
          if (dirHandleRef.current) {
            saveFileToHandle(tab.id, val).catch(e => console.error("Error writing to file handle:", e));
          }
          setTabs((prev) =>
            prev.map((t) => (t.id === tab.id ? { ...t, content: val, isDirty: false } : t))
          );
        });
      }
    });
  };

  const handleContentChange = (value: string | undefined) => {
    const val = value || '';
    const currentTabs = tabsRef.current;
    const currentActive = activeTabRef.current;
    const tab = currentTabs[currentActive];
    if (!tab) return;

    setTabs((prev) =>
      prev.map((t, idx) => (idx === currentActive ? { ...t, content: val, isDirty: true } : t))
    );

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      updateFileContent(tab.id, val).then(() => {
        if (dirHandleRef.current) {
          saveFileToHandle(tab.id, val).catch(e => console.error("Error writing to file handle:", e));
        }
        setTabs((prev) =>
          prev.map((t, idx) => (idx === currentActive ? { ...t, isDirty: false } : t))
        );
      });
    }, 800);
  };

  const handleItemClick = (item: FlatTreeItem) => {
    if (item.type === 'directory') {
      setSelectedDirId(item.id);
      setExpandedDirs((prev) => ({
        ...prev,
        [item.id]: !prev[item.id],
      }));
    } else {
      setSelectedDirId(item.parentId || 'root');
      openFile(item.id);
    }
  };

  const handleCreateFile = async () => {
    const name = prompt(`New File name:`);
    if (!name) return;
    const targetDir = selectedDirId;
    
    if (dirHandle) {
      try {
        await createEntryInHandle(targetDir, name, 'file');
        const localEntries = await readDirectoryHandle(dirHandle, 'root');
        setEntries(localEntries);
        await syncLocalEntriesToIndexedDB(localEntries);
        const fileId = targetDir === 'root' ? name : `${targetDir}/${name}`;
        const newFile = localEntries.find(e => e.id === fileId);
        if (newFile) {
          openFile(newFile.id);
        }
      } catch (err) {
        console.error('Error creating local file:', err);
      }
    } else {
      const newFile = await writeFile(targetDir, name, '');
      await refreshTree();
      openFile(newFile.id);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt(`New Folder name:`);
    if (!name) return;
    const targetDir = selectedDirId;
    
    if (dirHandle) {
      try {
        await createEntryInHandle(targetDir, name, 'directory');
        const localEntries = await readDirectoryHandle(dirHandle, 'root');
        setEntries(localEntries);
        await syncLocalEntriesToIndexedDB(localEntries);
      } catch (err) {
        console.error('Error creating local folder:', err);
      }
    } else {
      await createDirectory(targetDir, name);
      await refreshTree();
    }
  };

  const flatTree = buildFlatTree(entries, 'root', 0, expandedDirs);

  return (
    <div className="editor-window">
      {/* File Tree Sidebar */}
      <div className="editor-sidebar">
        <div className="editor-sidebar-header">
          <span>EXPLORER</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={handleSyncFolder}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px' }}
              title="Sync Folder"
            >
              🔄
            </button>
            <button
              onClick={handleCreateFile}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              title="New File"
            >
              📄
            </button>
            <button
              onClick={handleCreateFolder}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              title="New Folder"
            >
              ⬡
            </button>
          </div>
        </div>
        <div className="editor-file-tree">
          {flatTree.map((item) => {
            const entry = entries.find((e) => e.id === item.id);
            const icon = entry ? getFileIcon(entry) : (item.type === 'directory' ? '⬡' : '📄');
            return (
              <div
                key={item.id}
                className={`file-tree-item ${currentTab?.id === item.id ? 'active' : ''} ${selectedDirId === item.id ? 'selected-dir' : ''}`}
                style={{ paddingLeft: 12 + item.indent * 12 }}
                onClick={() => handleItemClick(item)}
              >
                <span className="file-tree-icon" style={{ marginRight: '6px' }}>
                  {icon}
                </span>
                {item.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Editor */}
      <div className="editor-main">
        {/* Tabs */}
        <div className="editor-tabs">
          {tabs.map((tab, i) => (
            <div
              key={tab.id}
              className={`editor-tab ${i === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              <span className="editor-tab-icon" style={{ fontSize: 10, marginRight: 4 }}>
                {entries.find((e) => e.id === tab.id) ? getFileIcon(entries.find((e) => e.id === tab.id)!) : '📄'}
              </span>
              {tab.name}
              {tab.isDirty && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>●</span>}
              <span className="editor-tab-close" onClick={(e) => closeTab(i, e)}>×</span>
            </div>
          ))}
        </div>

        {/* Monaco Editor */}
        <div className="editor-content">
          {currentTab ? (
            <Editor
              key={currentTab.id}
              height="100%"
              language={currentTab.language}
              value={currentTab.content}
              theme={settings.theme === 'dark' ? 'vs-dark' : 'vs'}
              loading={
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '12px',
                  background: 'var(--abyss)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-code)',
                  fontSize: '11px',
                  letterSpacing: '1px'
                }}>
                  <div className="spinner" style={{ width: 30, height: 30 }}>
                    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="18" stroke="var(--border)" strokeWidth="3" />
                      <circle cx="20" cy="20" r="18" stroke="var(--text-secondary)" strokeWidth="3" strokeDasharray="30 150" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span>MOUNTING MONACO ENGINE...</span>
                </div>
              }
              onMount={handleEditorMount}
              onChange={handleContentChange}
              options={{
                fontSize: 13,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
                fontLigatures: true,
                minimap: { enabled: true, scale: 1 },
                lineNumbers: 'on',
                renderWhitespace: 'none',
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true,
                automaticLayout: true,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-code)',
              fontSize: '13px'
            }}>
              NO OPEN FILES — SELECT FROM EXPLORER
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="editor-statusbar">
          <div className="editor-statusbar-item accent">
            <span>⑂</span>
            <span>main</span>
          </div>
          <div className="editor-statusbar-item">
            <span>● 0 errors</span>
          </div>
          <div style={{ flex: 1 }} />
          {currentTab && (
            <>
              <button 
                onClick={() => {
                  const url = window.location.origin + '/preview/' + currentTab.id;
                  openWindow('browser', { url });
                }}
                className="editor-statusbar-item accent-btn"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--cyan)', 
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0 8px',
                  height: '100%',
                }}
              >
                <span>▶ Preview</span>
              </button>
              <div className="editor-statusbar-item">
                <span>Ln {cursorInfo.line}, Col {cursorInfo.col}</span>
              </div>
              <div className="editor-statusbar-item">
                <span>{currentTab.language}</span>
              </div>
            </>
          )}
          <div className="editor-statusbar-item">
            <span>UTF-8</span>
          </div>
          <div className="editor-statusbar-item accent">
            <span>⬡ DEV AURA</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorApp;
