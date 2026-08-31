'use client';

import { create } from 'zustand';

import { publicEnv } from '@/config/env.public';

export type ColorMode = 'dark' | 'light' | 'system';

/**
 * The list of selectable themes is NOT hard-coded here.
 *
 * `src/styles/themes/_config.scss` writes the ids of every enabled theme into
 * a `--themes-enabled` custom property on :root; we read it back at runtime.
 * Turning a theme off in the SCSS registry therefore removes it from the
 * switcher too, with no TypeScript change.
 */
export function readEnabledThemes(): string[] {
  if (typeof window === 'undefined') return [publicEnv.defaultTheme];
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--themes-enabled')
    .trim()
    .replace(/^["']|["']$/g, '');
  const ids = raw.split(/\s+/).filter(Boolean);
  return ids.length > 0 ? ids : [publicEnv.defaultTheme];
}

interface ThemeState {
  theme: string;
  mode: ColorMode;
  availableThemes: string[];
  hydrated: boolean;
  setTheme: (theme: string) => void;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  hydrate: () => void;
}

function apply(theme: string, mode: ColorMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.mode = mode;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: publicEnv.defaultTheme,
  mode: publicEnv.defaultColorMode,
  availableThemes: [publicEnv.defaultTheme],
  hydrated: false,

  /**
   * Always resets to the .env default on load/refresh — any switch made via
   * setTheme/setMode only lasts for the current session, not across reloads.
   */
  hydrate: () => {
    const available = readEnabledThemes();
    const theme = available.includes(publicEnv.defaultTheme)
      ? publicEnv.defaultTheme
      : available[0];
    const mode = publicEnv.defaultColorMode;

    apply(theme, mode);
    set({ theme, mode, availableThemes: available, hydrated: true });
  },

  setTheme: (theme) => {
    if (!get().availableThemes.includes(theme)) return;
    apply(theme, get().mode);
    set({ theme });
  },

  setMode: (mode) => {
    apply(get().theme, mode);
    set({ mode });
  },

  toggleMode: () => {
    const current = get().mode;
    const resolved =
      current === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : current;
    get().setMode(resolved === 'dark' ? 'light' : 'dark');
  },
}));

/** Human labels for theme ids, used by the switcher. */
export const themeLabels: Record<string, { name: string; swatch: [string, string] }> = {
  'black-gold': { name: 'Black & Gold', swatch: ['#08080a', '#d4af37'] },
  'royal-purple': { name: 'Royal Purple', swatch: ['#0a0713', '#a78bfa'] },
  'emerald-jade': { name: 'Emerald Jade', swatch: ['#05100c', '#34d399'] },
  'ruby-noir': { name: 'Ruby Noir', swatch: ['#0d0507', '#f43f5e'] },
  'sapphire-ice': { name: 'Sapphire Ice', swatch: ['#050a14', '#38bdf8'] },
  'rose-platinum': { name: 'Rose Platinum', swatch: ['#0c0908', '#e8b4a0'] },
};
