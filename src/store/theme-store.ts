'use client';

import { create } from 'zustand';

import { publicEnv } from '@/config/env.public';
import {
  MODE_COOKIE,
  MODE_STORAGE_KEY,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
} from '@/config/theme';

export type ColorMode = 'dark' | 'light' | 'system';

export { MODE_STORAGE_KEY, THEME_STORAGE_KEY } from '@/config/theme';

/**
 * The choice is mirrored into cookies so the server can render `data-theme` /
 * `data-mode` on <html> straight away: that is what keeps the first paint
 * flash-free without shipping a blocking inline script.
 */
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
}

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
  writeCookie(THEME_COOKIE, theme);
  writeCookie(MODE_COOKIE, mode);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: publicEnv.defaultTheme,
  mode: publicEnv.defaultColorMode,
  availableThemes: [publicEnv.defaultTheme],
  hydrated: false,

  hydrate: () => {
    const available = readEnabledThemes();
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as ColorMode | null;

    const theme =
      storedTheme && available.includes(storedTheme)
        ? storedTheme
        : available.includes(publicEnv.defaultTheme)
          ? publicEnv.defaultTheme
          : available[0];
    const mode = storedMode ?? publicEnv.defaultColorMode;

    apply(theme, mode);
    set({ theme, mode, availableThemes: available, hydrated: true });
  },

  setTheme: (theme) => {
    if (!get().availableThemes.includes(theme)) return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    apply(theme, get().mode);
    set({ theme });
  },

  setMode: (mode) => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
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
