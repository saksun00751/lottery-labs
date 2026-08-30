import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { gamesEnabled } from '@/config/site-mode';

export default function GamesLayout({ children }: { children: ReactNode }) {
  if (!gamesEnabled) {
    redirect('/');
  }
  return children;
}
