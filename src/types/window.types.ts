// Window type definitions
export type AppType =
  | 'terminal'
  | 'editor'
  | 'browser'
  | 'filemanager'
  | 'ai'
  | 'settings'
  | 'sysmonitor'
  | 'notes'
  | 'welcome'
  | 'apiclient'
  | 'dbexplorer'
  | 'jsonformatter'
  | 'regex'
  | 'diffviewer'
  | 'devutils';

export interface WindowState {
  id: string;
  appType: AppType;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  workspaceId: string;
  // App-specific state passed as props
  appProps?: Record<string, unknown>;
}

export interface AppDefinition {
  id: AppType;
  name: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
}

export const APP_DEFINITIONS: Record<AppType, AppDefinition> = {
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: '▶',
    defaultWidth: 700,
    defaultHeight: 450,
    minWidth: 400,
    minHeight: 250,
  },
  editor: {
    id: 'editor',
    name: 'Code Editor',
    icon: '◈',
    defaultWidth: 900,
    defaultHeight: 580,
    minWidth: 500,
    minHeight: 350,
  },
  browser: {
    id: 'browser',
    name: 'Browser',
    icon: '◉',
    defaultWidth: 960,
    defaultHeight: 620,
    minWidth: 600,
    minHeight: 400,
  },
  filemanager: {
    id: 'filemanager',
    name: 'Files',
    icon: '◈',
    defaultWidth: 700,
    defaultHeight: 480,
    minWidth: 400,
    minHeight: 300,
  },
  ai: {
    id: 'ai',
    name: 'AURA AI',
    icon: '◆',
    defaultWidth: 420,
    defaultHeight: 600,
    minWidth: 320,
    minHeight: 400,
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: '⚙',
    defaultWidth: 640,
    defaultHeight: 480,
    minWidth: 400,
    minHeight: 350,
  },
  sysmonitor: {
    id: 'sysmonitor',
    name: 'System Monitor',
    icon: '◇',
    defaultWidth: 720,
    defaultHeight: 500,
    minWidth: 500,
    minHeight: 350,
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    icon: '◎',
    defaultWidth: 600,
    defaultHeight: 480,
    minWidth: 350,
    minHeight: 300,
  },
  welcome: {
    id: 'welcome',
    name: 'Welcome to DEV AURA OS',
    icon: '⬡',
    defaultWidth: 640,
    defaultHeight: 480,
    minWidth: 500,
    minHeight: 380,
  },
  apiclient: {
    id: 'apiclient',
    name: 'API Client',
    icon: '⇆',
    defaultWidth: 750,
    defaultHeight: 500,
    minWidth: 450,
    minHeight: 350,
  },
  dbexplorer: {
    id: 'dbexplorer',
    name: 'DB Explorer',
    icon: '🗄',
    defaultWidth: 800,
    defaultHeight: 520,
    minWidth: 500,
    minHeight: 350,
  },
  jsonformatter: {
    id: 'jsonformatter',
    name: 'JSON Formatter',
    icon: '{}',
    defaultWidth: 860,
    defaultHeight: 560,
    minWidth: 560,
    minHeight: 380,
  },
  regex: {
    id: 'regex',
    name: 'Regex Playground',
    icon: '/.*/',
    defaultWidth: 780,
    defaultHeight: 540,
    minWidth: 520,
    minHeight: 360,
  },
  diffviewer: {
    id: 'diffviewer',
    name: 'Diff Viewer',
    icon: '±',
    defaultWidth: 900,
    defaultHeight: 560,
    minWidth: 600,
    minHeight: 380,
  },
  devutils: {
    id: 'devutils',
    name: 'Dev Utils',
    icon: '⚒',
    defaultWidth: 760,
    defaultHeight: 540,
    minWidth: 500,
    minHeight: 380,
  },
};
