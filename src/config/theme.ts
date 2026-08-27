/**
 * Where the appearance choice lives. Shared by the client store that writes it
 * and the layout that reads it back during SSR, so it must stay free of any
 * 'use client' module.
 */
export const THEME_STORAGE_KEY = 'll:theme';
export const MODE_STORAGE_KEY = 'll:mode';

export const THEME_COOKIE = 'll_theme';
export const MODE_COOKIE = 'll_mode';

export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
