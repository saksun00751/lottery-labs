import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { lotteryEnabled } from '@/config/site-mode';

export default function LotteryLayout({ children }: { children: ReactNode }) {
  if (!lotteryEnabled) {
    redirect('/');
  }
  return children;
}
