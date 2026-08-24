import type { ReactNode } from 'react';

/**
 * The real document shell lives in `app/[locale]/layout.tsx` — it needs the
 * resolved locale to set `<html lang>` and pick the right script font.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
