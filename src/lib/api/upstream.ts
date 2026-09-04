import 'server-only';

import { cookies } from 'next/headers';

import { serverEnv } from '@/config/env.server';
import { routing } from '@/i18n/routing';

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

/** The backend only understands these four codes — everything else (incl. `my`) falls back to `th`. */
const API_LANGUAGE: Record<string, 'th' | 'en' | 'kh' | 'la'> = {
  th: 'th',
  en: 'en',
  km: 'kh',
  lo: 'la',
};

async function getApiLanguage(): Promise<'th' | 'en' | 'kh' | 'la'> {
  const cookieName =
    (typeof routing.localeCookie === 'object' ? routing.localeCookie.name : undefined) ??
    'NEXT_LOCALE';
  const store = await cookies();
  const locale = store.get(cookieName)?.value;
  return API_LANGUAGE[locale ?? ''] ?? 'th';
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
        message: 'API_BASE_URL is not set. Set it in .env.local.',
      },
    };
  }

  const url = `${serverEnv.apiBaseUrl}/${path.replace(/^\/+/, '')}${init.search ?? ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), serverEnv.apiTimeoutMs);
  const language = await getApiLanguage();

  try {
    const response = await fetch(url, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        // Pusher private-channel authorisation posts URL-encoded form data.
        // All ordinary browser requests remain JSON through the generic relay.
        'Content-Type': init.contentType ?? 'application/json',
        'X-Language': language,
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
