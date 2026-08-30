'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ApiError } from '@/lib/api/client';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { useThemeStore } from '@/store/theme-store';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry a rejected request — it will keep being rejected.
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session; useState keeps it stable across renders.
  const [queryClient] = useState(makeQueryClient);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>{children}</RealtimeProvider>
      {/* No `limit` here — src/lib/toast.tsx owns capping via FIFO dismissal
          so a 4th toast closes the oldest immediately instead of queueing. */}
      <ToastContainer
        position="top-center"
        autoClose={4500}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
      />
    </QueryClientProvider>
  );
}
