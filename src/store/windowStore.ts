import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { WindowState, AppType } from '../types/window.types';
import { APP_DEFINITIONS } from '../types/window.types';

let zCounter = 100;
let windowIdCounter = 0;

interface WindowStore {
  windows: Record<string, WindowState>;
  activeWorkspace: string;

  openWindow: (appType: AppType, appProps?: Record<string, unknown>) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
  getWindowsByWorkspace: (workspaceId: string) => WindowState[];
  setActiveWorkspace: (workspaceId: string) => void;
}

const getDefaultPosition = (index: number) => ({
  x: 60 + (index % 5) * 30,
  y: 40 + (index % 4) * 24,
});

export const useWindowStore = create<WindowStore>()(
  subscribeWithSelector((set, get) => ({
    windows: {},
    activeWorkspace: 'main',

    setActiveWorkspace: (workspaceId) => set({ activeWorkspace: workspaceId }),

    openWindow: (appType, appProps) => {
      const def = APP_DEFINITIONS[appType];
      const id = `${appType}-${++windowIdCounter}`;
      const existingCount = Object.keys(get().windows).length;
      const pos = getDefaultPosition(existingCount);

      const newWindow: WindowState = {
        id,
        appType,
        title: def.name,
        icon: def.icon,
        x: pos.x,
        y: pos.y,
        width: def.defaultWidth,
        height: def.defaultHeight,
        zIndex: ++zCounter,
        isMinimized: false,
        isMaximized: false,
        isFocused: true,
        workspaceId: get().activeWorkspace,
        appProps,
      };

      // Unfocus all others
      set((state) => {
        const updated: Record<string, WindowState> = {};
        for (const [k, w] of Object.entries(state.windows)) {
          updated[k] = { ...w, isFocused: false };
        }
        updated[id] = newWindow;
        return { windows: updated };
      });

      return id;
    },

    closeWindow: (id) => {
      set((state) => {
        const { [id]: _, ...rest } = state.windows;
        return { windows: rest };
      });
    },

    focusWindow: (id) => {
      set((state) => {
        const updated: Record<string, WindowState> = {};
        for (const [k, w] of Object.entries(state.windows)) {
          updated[k] = { ...w, isFocused: k === id, zIndex: k === id ? ++zCounter : w.zIndex };
        }
        return { windows: updated };
      });
    },

    minimizeWindow: (id) => {
      set((state) => ({
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], isMinimized: true, isFocused: false },
        },
      }));
    },

    maximizeWindow: (id) => {
      set((state) => ({
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], isMaximized: true, isFocused: true, zIndex: ++zCounter },
        },
      }));
    },

    restoreWindow: (id) => {
      set((state) => ({
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], isMinimized: false, isMaximized: false, isFocused: true, zIndex: ++zCounter },
        },
      }));
    },

    updateWindowPosition: (id, x, y) => {
      set((state) => ({
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], x, y },
        },
      }));
    },

    updateWindowSize: (id, width, height) => {
      set((state) => ({
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], width, height },
        },
      }));
    },

    getWindowsByWorkspace: (workspaceId) => {
      return Object.values(get().windows).filter((w) => w.workspaceId === workspaceId);
    },
  }))
);
