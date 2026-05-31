import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OSSettings {
  geminiApiKey: string;
  accentColor: string;
  fontScale: number;
  animationsEnabled: boolean;
  username: string;
  theme: 'light' | 'dark';
}

interface SystemStore {
  booted: boolean;
  settings: OSSettings;
  notifications: Notification[];
  isCmdPaletteOpen: boolean;
  contextMenu: ContextMenuState | null;
  currentTime: string;
  activeFileId: string | null;
  activeFileContent: string;

  setBooted: () => void;
  updateSettings: (partial: Partial<OSSettings>) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  openCmdPalette: () => void;
  closeCmdPalette: () => void;
  showContextMenu: (state: ContextMenuState) => void;
  hideContextMenu: () => void;
  setCurrentTime: (t: string) => void;
  setActiveFile: (id: string | null, content: string) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
}

let notifId = 0;

export const useSystemStore = create<SystemStore>()(
  persist(
    (set) => ({
      booted: false,
      settings: {
        geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
        accentColor: '#000000',
        fontScale: 1,
        animationsEnabled: true,
        username: 'developer',
        theme: 'light',
      },
      notifications: [],
      isCmdPaletteOpen: false,
      contextMenu: null,
      currentTime: '',
      activeFileId: null,
      activeFileContent: '',

      setBooted: () => set({ booted: true }),

      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      addNotification: (n) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...n, id: `notif-${++notifId}`, timestamp: Date.now() },
          ].slice(-10),
        })),

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      openCmdPalette: () => set({ isCmdPaletteOpen: true }),
      closeCmdPalette: () => set({ isCmdPaletteOpen: false }),

      showContextMenu: (state) => set({ contextMenu: state }),
      hideContextMenu: () => set({ contextMenu: null }),

      setCurrentTime: (t) => set({ currentTime: t }),

      setActiveFile: (id, content) => set({ activeFileId: id, activeFileContent: content }),
    }),
    {
      name: 'devaura-system',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
