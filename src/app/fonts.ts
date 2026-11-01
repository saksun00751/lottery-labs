import {
  Noto_Sans_Khmer,
  Noto_Sans_Lao,
  Noto_Sans_Myanmar,
  Prompt,
} from 'next/font/google';

/**
 * One face per script (Prompt serves Latin and Thai). Burmese, Lao and Khmer will not render correctly with a
 * Latin fallback — the glyph stacking collapses — so each gets its own family
 * exposed as a CSS variable and wired up per `<html lang>` in globals.scss.
 *
 * `display: swap` keeps first paint fast; each family is only downloaded when
 * a page actually references its variable.
 */

/** Prompt covers both Latin and Thai, so it replaces Inter + Noto Sans Thai. */
export const prompt = Prompt({
  subsets: ['latin', 'thai'],
  variable: '--f-prompt',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  variable: '--f-myanmar',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const notoLao = Noto_Sans_Lao({
  subsets: ['lao'],
  variable: '--f-lao',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const notoKhmer = Noto_Sans_Khmer({
  subsets: ['khmer'],
  variable: '--f-khmer',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const fontVariables = [
  prompt.variable,
  notoMyanmar.variable,
  notoLao.variable,
  notoKhmer.variable,
].join(' ');
