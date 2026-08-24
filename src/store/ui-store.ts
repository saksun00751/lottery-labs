'use client';

import { create } from 'zustand';

export interface Toast {
  id: string;
  tone: 'success' | 'danger' | 'info' | 'warning';
  title: string;
  description?: string;
}

interface UiState {
  /** Desktop rail collapsed to icons only. */
  sidebarCollapsed: boolean;
  /** Mobile drawer visible. */
  drawerOpen: boolean;
  toasts: Toast[];

  toggleSidebar: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  drawerOpen: false,
  toasts: [],

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  pushToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => get().dismissToast(id), 4_500);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
