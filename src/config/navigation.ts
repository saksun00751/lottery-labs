import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  Disc3,
  Gamepad2,
  Gift,
  Headphones,
  History,
  Home,
  KeyRound,
  ScrollText,
  Ticket,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { publicEnv } from './env.public';
import { gamesEnabled, lotteryEnabled } from './site-mode';

export interface NavItem {
  href: string;
  /** Key inside the `nav` message namespace. */
  labelKey: string;
  icon: LucideIcon;
  enabled?: boolean;
}

export interface NavSection {
  /** Key inside the `nav` namespace, or null for the ungrouped top block. */
  titleKey: string | null;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    titleKey: null,
    items: [{ href: '/', labelKey: 'home', icon: Home }],
  },
  {
    titleKey: 'sectionPlay',
    items: [
      { href: '/lottery', labelKey: 'lottery', icon: Ticket, enabled: lotteryEnabled },
      {
        href: '/lottery/today',
        labelKey: 'todayLottery',
        icon: CalendarDays,
        enabled: lotteryEnabled,
      },
      { href: '/slip', labelKey: 'slip', icon: ScrollText, enabled: lotteryEnabled },
      { href: '/results', labelKey: 'results', icon: Trophy, enabled: lotteryEnabled },
    ],
  },
  {
    titleKey: 'sectionGames',
    items: [{ href: '/games', labelKey: 'games', icon: Gamepad2, enabled: gamesEnabled }],
  },
  {
    titleKey: 'sectionWallet',
    items: [
      { href: '/deposit', labelKey: 'deposit', icon: ArrowDownToLine },
      { href: '/withdraw', labelKey: 'withdraw', icon: ArrowUpFromLine },
      {
        href: '/promotion',
        labelKey: 'promotion',
        icon: Gift,
        enabled: publicEnv.features.promotion,
      },
      {
        href: '/spin',
        labelKey: 'spin',
        icon: Disc3,
        enabled: publicEnv.features.diamond,
      },
      { href: '/history', labelKey: 'history', icon: History },
    ],
  },
  {
    titleKey: 'sectionAccount',
    items: [
      { href: '/profile', labelKey: 'profile', icon: User },
      {
        href: '/referral',
        labelKey: 'referral',
        icon: Users,
        enabled: publicEnv.features.referral,
      },
      { href: '/profile/change-password', labelKey: 'changePassword', icon: KeyRound },
      { href: '/contact', labelKey: 'contact', icon: Headphones },
    ],
  },
];

/** Sections with disabled items stripped out, ready to render. */
export const visibleNavSections = navSections
  .map((section) => ({
    ...section,
    items: section.items.filter((item) => item.enabled !== false),
  }))
  .filter((section) => section.items.length > 0);

/**
 * The five destinations that fit comfortably in the mobile tab bar.
 *
 * When both verticals are enabled, Lottery and Games sit side by side
 * instead of defaulting to the lottery-only layout — Slip/History still
 * live one tap away on their own pages, just not pinned to the bar.
 */
export const bottomNavItems: NavItem[] = (() => {
  const home: NavItem = { href: '/', labelKey: 'home', icon: Home };
  const deposit: NavItem = { href: '/deposit', labelKey: 'deposit', icon: ArrowDownToLine };
  const contact: NavItem = { href: '/contact', labelKey: 'contact', icon: Headphones };

  if (lotteryEnabled && gamesEnabled) {
    return [
      home,
      { href: '/lottery', labelKey: 'lottery', icon: Ticket },
      { href: '/games', labelKey: 'games', icon: Gamepad2 },
      deposit,
      contact,
    ];
  }

  if (gamesEnabled) {
    return [
      home,
      { href: '/games', labelKey: 'games', icon: Gamepad2 },
      deposit,
      { href: '/history', labelKey: 'history', icon: History },
      contact,
    ];
  }

  return [
    home,
    { href: '/lottery', labelKey: 'lottery', icon: Ticket },
    deposit,
    { href: '/slip', labelKey: 'slip', icon: ScrollText },
    contact,
  ];
})();
