import {
  Inter,
  Noto_Sans_Khmer,
  Noto_Sans_Lao,
  Noto_Sans_Myanmar,
  Noto_Sans_Thai,
} from 'next/font/google';

/**
 * One face per script. Burmese, Lao and Khmer will not render correctly with a
 * Latin fallback — the glyph stacking collapses — so each gets its own family
 * exposed as a CSS variable and wired up per `<html lang>` in globals.scss.
 *
 * `display: swap` keeps first paint fast; each family is only downloaded when
 * a page actually references its variable.
 */

export const inter = Inter({
  subsets: ['latin'],
  variable: '--f-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const notoThai = Noto_Sans_Thai({
  subsets: ['thai'],
  variable: '--f-thai',
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
  inter.variable,
  notoThai.variable,
  notoMyanmar.variable,
  notoLao.variable,
  notoKhmer.variable,
].join(' ');
