'use client';

import type Echo from 'laravel-echo';
import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { qk } from '@/lib/api/queries';
import { hasAuthFlagCookie } from '@/lib/auth-cookie';
import { pushToast } from '@/lib/toast';
import { useRealtimeStore } from '@/store/realtime-store';

type RealtimeConfig = {
  key?: unknown;
  ws_host?: unknown;
  wsHost?: unknown;
  ws_port?: unknown;
  wsPort?: unknown;
  wss_port?: unknown;
  wssPort?: unknown;
  ws_path?: unknown;
  wsPath?: unknown;
  force_tls?: unknown;
  forceTLS?: unknown;
  encrypted?: unknown;
  cluster?: unknown;
  shared_member_channel?: unknown;
  sharedMemberChannel?: unknown;
};

type RealtimeContext = {
  member_code?: unknown;
  private_channel?: unknown;
};

type RealtimePayload = {
  event?: unknown;
  method?: unknown;
  message?: unknown;
  data?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrap(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  return asRecord(record?.data) ?? asRecord(record?.realtime) ?? record;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function number(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

/**
 * Keeps React Query coherent when the backend broadcasts a wallet, ticket or
 * draw update. REST refetches remain authoritative; WebSocket data is never
 * trusted as the only source for financial state.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const echoRef = useRef<Echo<'pusher'> | null>(null);

  useEffect(() => {
    // No session cookie at all — skip the auth check outright instead of
    // firing it and letting it 401, which is all a signed-out visitor is.
    if (!hasAuthFlagCookie()) return;

    let active = true;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let reconciliation: ReturnType<typeof setTimeout> | undefined;
    const joinedChannels: string[] = [];

    const invalidateWallet = () => {
      void queryClient.invalidateQueries({ queryKey: qk.wallet });
      void queryClient.invalidateQueries({ queryKey: qk.withdrawInfo });
      void queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    };

    const invalidateTickets = () => {
      void queryClient.invalidateQueries({ queryKey: qk.tickets() });
      void queryClient.invalidateQueries({ queryKey: ['lottery', 'ticket'] });
    };

    const invalidateDraws = () => {
      void queryClient.invalidateQueries({ queryKey: qk.markets });
      void queryClient.invalidateQueries({ queryKey: ['lottery', 'results'] });
    };

    const reconcileWallet = () => {
      if (reconciliation) clearTimeout(reconciliation);
      reconciliation = setTimeout(invalidateWallet, 500);
    };

    const notify = (tone: 'success' | 'danger' | 'info', message: unknown, fallback: string) => {
      pushToast({ tone, title: text(message) ?? fallback });
    };

    const onPublicActivity = (raw: unknown) => {
      const payload = (asRecord(raw) ?? {}) as RealtimePayload;
      const event = text(payload.event);
      if (!event) return;

      if (event === 'lotto.draw_closed') {
        notify('info', payload.message, 'งวดหวยปิดรับแทงแล้ว');
        invalidateDraws();
      } else if (event === 'lotto.draw_resulted') {
        notify('success', payload.message, 'ประกาศผลรางวัลแล้ว');
        invalidateDraws();
        invalidateTickets();
      } else if (event === 'lotto.draw_status_changed') {
        notify('info', payload.message, 'สถานะงวดหวยเปลี่ยนแล้ว');
        invalidateDraws();
      } else if (event === 'lotto.ticket.list.changed') {
        invalidateTickets();
      }
    };

    const onMemberActivity = (raw: unknown) => {
      const payload = (asRecord(raw) ?? {}) as RealtimePayload;
      const event = text(payload.event);
      const method = text(payload.method);
      const affectsWallet =
        event === 'wallet.deposit_approved' ||
        event === 'wallet.withdraw_approved' ||
        event === 'wallet.withdraw_rejected' ||
        event === 'wallet.rollback_applied' ||
        event === 'wallet.admin_adjusted' ||
        event === 'lotto.ticket_won' ||
        event === 'lotto.ticket_refunded';

      switch (event) {
        case 'wallet.deposit_approved':
          notify('success', payload.message, 'เติมเงินสำเร็จ');
          break;
        case 'wallet.withdraw_approved':
          notify('success', payload.message, 'ถอนเงินสำเร็จ');
          break;
        case 'wallet.withdraw_rejected':
          notify('danger', payload.message, 'การถอนเงินถูกปฏิเสธ');
          break;
        case 'wallet.rollback_applied':
        case 'wallet.admin_adjusted':
          notify('info', payload.message, 'ยอดเงินได้รับการปรับปรุง');
          break;
        case 'lotto.ticket_won':
          notify('success', payload.message, 'คุณถูกรางวัลหวย');
          invalidateTickets();
          break;
        case 'lotto.ticket_refunded':
          notify('info', payload.message, 'คืนเงินค่าหวยแล้ว');
          invalidateTickets();
          break;
      }

      if (
        affectsWallet ||
        method === 'deposit' ||
        method === 'withdraw' ||
        method === 'rollback' ||
        method === 'adjust'
      ) {
        reconcileWallet();
      }
    };

    async function sendHeartbeat() {
      await fetch('/api/realtime/heartbeat', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      }).catch(() => undefined);
    }

    async function connect() {
      try {
        // `context` reads the httpOnly session cookie server-side and 401s
        // instantly for a signed-out visitor — check it first so a guest
        // never triggers the `config` call (a real upstream request) at all.
        const contextResponse = await fetch('/api/realtime/context', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!active || !contextResponse.ok) return;

        const context = unwrap(await contextResponse.json()) as RealtimeContext | null;
        if (!active || !text(context?.private_channel)) return;

        const configResponse = await fetch('/api/realtime/config', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!active || !configResponse.ok) return;

        const config = unwrap(await configResponse.json()) as RealtimeConfig | null;
        const key = text(config?.key);
        const privateChannel = text(context?.private_channel);
        if (!key || !privateChannel) return;

        const wsHost = text(config?.ws_host) ?? text(config?.wsHost);
        const sharedChannel = text(config?.shared_member_channel) ?? text(config?.sharedMemberChannel);

        // Loaded only for signed-in members, after the auth checks above, so
        // guests and the first paint never pay for the websocket libraries.
        const [{ default: EchoClient }, { default: Pusher }] = await Promise.all([
          import('laravel-echo'),
          import('pusher-js'),
        ]);
        if (!active) return;

        // Laravel Echo expects Pusher to be available globally in browsers.
        (window as typeof window & { Pusher?: typeof Pusher }).Pusher = Pusher;
        const echo = new EchoClient<'pusher'>({
          broadcaster: 'pusher',
          key,
          cluster: text(config?.cluster) ?? 'mt1',
          wsHost,
          wsPort: number(config?.ws_port ?? config?.wsPort, 6001),
          wssPort: number(config?.wss_port ?? config?.wssPort ?? config?.ws_port ?? config?.wsPort, 443),
          wsPath: text(config?.ws_path) ?? text(config?.wsPath) ?? '',
          forceTLS: boolean(config?.force_tls ?? config?.forceTLS ?? config?.encrypted, true),
          enabledTransports: ['ws', 'wss'],
          // This same-origin endpoint reads the httpOnly cookie server-side.
          authEndpoint: '/api/realtime/auth',
        });
        if (!active) {
          echo.disconnect();
          return;
        }

        echoRef.current = echo;

        // Drive polling cadence from the socket's real state.
        const connection = echo.connector.pusher.connection;
        const syncConnected = () =>
          useRealtimeStore.getState().setConnected(connection.state === 'connected');
        connection.bind('state_change', syncConnected);
        syncConnected();
        if (sharedChannel) {
          echo.private(sharedChannel).listen('.public.activity.updated', onPublicActivity);
          joinedChannels.push(sharedChannel);
        }
        echo.private(privateChannel)
          .listen('.member.activity.updated', onMemberActivity)
          .listen('.member.balance.updated', reconcileWallet);
        joinedChannels.push(privateChannel);

        await sendHeartbeat();
        heartbeat = setInterval(() => void sendHeartbeat(), 60_000);
      } catch {
        // Polling remains active, so a failed realtime setup does not leave
        // wallet data stale or turn a transient network error into a UI error.
      }
    }

    void connect();
    return () => {
      active = false;
      useRealtimeStore.getState().setConnected(false);
      if (heartbeat) clearInterval(heartbeat);
      if (reconciliation) clearTimeout(reconciliation);
      if (echoRef.current) {
        for (const channel of joinedChannels) echoRef.current.leave(channel);
        echoRef.current.disconnect();
        echoRef.current = null;
      }
    };
  }, [queryClient]);

  return children;
}
