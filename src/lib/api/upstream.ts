import 'server-only';

import { cookies } from 'next/headers';

import { serverEnv } from '@/config/env.server';

/**
 * Server-side helper that talks to the real backend. Only ever called from
 * Route Handlers / Server Components — the access token stays on this side of
 * the wire.
 */
export interface UpstreamResult {
  status: number;
  body: unknown;
}

export async function getAccessToken() {
  const store = await cookies();
  return store.get(serverEnv.sessionCookieName)?.value ?? null;
}

export async function callUpstream(
  path: string,
  init: {
    method: string;
    search?: string;
    body?: BodyInit | null;
    contentType?: string | null;
    idempotencyKey?: string | null;
    token?: string | null;
  },
): Promise<UpstreamResult> {
  if (!serverEnv.apiBaseUrl) {
    return {
      status: 503,
      body: {
        code: 'api_not_configured',
        message:
          'API_BASE_URL is not set. Set it in .env.local, or run with NEXT_PUBLIC_USE_MOCK=true.',
      },
    };
  }

  const url = `${serverEnv.apiBaseUrl}/${path.replace(/^\/+/, '')}${init.search ?? ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverEnv.apiTimeoutMs);

  try {
    const response = await fetch(url, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        ...(init.contentType ? { 'Content-Type': init.contentType } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(serverEnv.apiKey ? { 'X-Api-Key': serverEnv.apiKey } : {}),
        ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
      },
      body: init.body ?? undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await response.text();
    const body = text ? safeJson(text) : null;
    return { status: response.status, body };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      status: aborted ? 504 : 502,
      body: {
        code: aborted ? 'upstream_timeout' : 'upstream_unreachable',
        message: aborted
          ? 'ระบบตอบสนองช้ากว่าปกติ กรุณาลองใหม่อีกครั้ง'
          : 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง',
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { code: 'invalid_upstream_response', message: text.slice(0, 300) };
  }
}
