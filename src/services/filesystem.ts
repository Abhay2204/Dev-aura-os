import { openDB, type IDBPDatabase } from 'idb';

export interface FSEntry {
  id: string;
  name: string;
  type: 'file' | 'directory';
  parentId: string | null;
  content: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
  mimeType?: string;
}

const DB_NAME = 'devaura-fs';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let db: IDBPDatabase | null = null;

async function getDB() {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('parentId', 'parentId');
      store.createIndex('name', 'name');
    },
  });
  return db;
}

let entryId = Date.now();

export async function initFileSystem() {
  const database = await getDB();
  const root = await database.get(STORE_NAME, 'root');
  if (!root) {
    const now = Date.now();
    const rootEntry: FSEntry = {
      id: 'root',
      name: '/',
      type: 'directory',
      parentId: null,
      content: '',
      size: 0,
      createdAt: now,
      modifiedAt: now,
    };
    await database.put(STORE_NAME, rootEntry);

    // Create default structure
    const defaultDirs = [
      { id: 'home', name: 'home', parentId: 'root' },
      { id: 'projects', name: 'projects', parentId: 'home' },
      { id: 'documents', name: 'documents', parentId: 'home' },
      { id: 'downloads', name: 'downloads', parentId: 'home' },
    ];

    for (const dir of defaultDirs) {
      await database.put(STORE_NAME, {
        ...dir,
        type: 'directory',
        content: '',
        size: 0,
        createdAt: now,
        modifiedAt: now,
      } as FSEntry);
    }

    // Create a sample file
    await database.put(STORE_NAME, {
      id: 'welcome-md',
      name: 'README.md',
      type: 'file',
      parentId: 'home',
      content: `# Welcome to DEV AURA OS\n\nThis is your developer operating system.\n\n## Getting Started\n\n- Open the **Terminal** to run commands\n- Open the **Code Editor** to write code  \n- Ask **AURA AI** anything about your workspace\n- Browse the web with the **Browser**\n\n## Keyboard Shortcuts\n\n| Action | Shortcut |\n|--------|----------|\n| Command Palette | \`Ctrl+K\` |\n| New Terminal | \`Ctrl+T\` |\n| New Editor | \`Ctrl+E\` |\n| AI Assistant | \`Ctrl+/\` |\n\nBuilt with ◆ by DEV AURA OS\n`,
      size: 512,
      createdAt: now,
      modifiedAt: now,
      mimeType: 'text/markdown',
    } as FSEntry);

    await database.put(STORE_NAME, {
      id: 'sample-ts',
      name: 'hello.ts',
      type: 'file',
      parentId: 'projects',
      content: `// Hello from DEV AURA OS!\nimport { AuraRuntime } from '@devaura/core';\n\nconst runtime = AuraRuntime.init({\n  workspace: 'my-project',\n  ai: { model: 'gemini-2.0-flash' },\n});\n\nawait runtime.boot();\n\nconsole.log('DEV AURA OS is running ⬡');\n`,
      size: 256,
      createdAt: now,
      modifiedAt: now,
      mimeType: 'text/typescript',
    } as FSEntry);
  }
  return database;
}

export async function listDirectory(parentId: string): Promise<FSEntry[]> {
  const database = await getDB();
  const index = database.transaction(STORE_NAME).store.index('parentId');
  const entries = await index.getAll(parentId);
  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFile(id: string): Promise<FSEntry | null> {
  const database = await getDB();
  return (await database.get(STORE_NAME, id)) || null;
}

export async function writeFile(parentId: string, name: string, content: string): Promise<FSEntry> {
  const database = await getDB();
  const existing = await listDirectory(parentId);
  const found = existing.find((e) => e.name === name && e.type === 'file');

  const entry: FSEntry = found
    ? { ...found, content, size: content.length, modifiedAt: Date.now() }
    : {
        id: `file-${++entryId}`,
        name,
        type: 'file',
        parentId,
        content,
        size: content.length,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

  await database.put(STORE_NAME, entry);
  return entry;
}

export async function createDirectory(parentId: string, name: string): Promise<FSEntry> {
  const database = await getDB();
  const entry: FSEntry = {
    id: `dir-${++entryId}`,
    name,
    type: 'directory',
    parentId,
    content: '',
    size: 0,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };
  await database.put(STORE_NAME, entry);
  return entry;
}

export async function deleteEntry(id: string): Promise<void> {
  const database = await getDB();
  await database.delete(STORE_NAME, id);
}

export function getFileIcon(entry: FSEntry): string {
  if (entry.type === 'directory') return '⬡';
  const ext = entry.name.split('.').pop()?.toLowerCase();
  const codeExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'html', 'css', 'json', 'sh'];
  const configExtensions = ['env', 'gitignore', 'yaml', 'yml', 'toml', 'json'];
  if (codeExtensions.includes(ext || '')) return '◈';
  if (configExtensions.includes(ext || '')) return '⚙';
  return '📄';
}

export async function getAllEntries(): Promise<FSEntry[]> {
  const database = await getDB();
  return await database.getAll(STORE_NAME);
}

export async function getEntryByPath(path: string, currentDirId: string = 'root'): Promise<FSEntry | null> {
  if (!path) return null;
  const database = await getDB();
  
  // Normalize path
  const isAbsolute = path.startsWith('/');
  const parts = path.split('/').filter(Boolean);
  
  let current: FSEntry | null = null;
  if (isAbsolute) {
    current = await database.get(STORE_NAME, 'root');
  } else {
    current = await database.get(STORE_NAME, currentDirId);
  }
  
  if (!current) return null;
  
  for (const part of parts) {
    if (!current) return null;
    if (part === '.') continue;
    if (part === '..') {
      if (current.parentId) {
        current = (await database.get(STORE_NAME, current.parentId)) || null;
      } else {
        current = null;
      }
      continue;
    }
    
    if (current.type !== 'directory') return null; // Can't traverse file
    const children = await listDirectory(current.id);
    const found = children.find((c) => c.name === part);
    if (!found) return null;
    current = found;
  }
  
  return current;
}

export async function getPathForEntry(id: string): Promise<string> {
  const database = await getDB();
  let current = await database.get(STORE_NAME, id);
  if (!current) return '';
  if (current.id === 'root') return '/';
  
  const parts: string[] = [];
  while (current && current.id !== 'root') {
    parts.unshift(current.name);
    if (!current.parentId) break;
    current = await database.get(STORE_NAME, current.parentId);
  }
  return '/' + parts.join('/');
}

export async function updateFileContent(id: string, content: string): Promise<FSEntry> {
  const database = await getDB();
  const entry = await database.get(STORE_NAME, id);
  if (!entry || entry.type !== 'file') throw new Error('File not found');
  const updated = { ...entry, content, size: content.length, modifiedAt: Date.now() };
  await database.put(STORE_NAME, updated);
  return updated;
}

