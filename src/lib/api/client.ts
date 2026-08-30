import type { ApiErrorShape } from '@/types';

import { pushToast } from '@/lib/toast';

/**
 * Browser-side API client.
 *
 * Every call goes to our own origin (`/api/proxy/...`). The Route Handler
 * behind it attaches the access token from the httpOnly session cookie and
 * forwards the request upstream, so the real API host and the token never
 * reach client JavaScript.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, body: Partial<ApiErrorShape>) {
    super(body.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code || 'unknown_error';
    this.fields = body.fields;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Set on every mutation that moves money or places a bet. The backend must
   * treat a repeated key as the same operation so a double-tap or a retry can
   * never charge twice.
   */
  idempotencyKey?: string;
}

/**
 * A 401 from the upstream API means the session token is invalid or expired —
 * there's no refresh-token flow, so the only recovery is signing in again.
 * `proxy.ts` only gates navigation on the session *cookie's presence*, not its
 * validity, so a stale-but-present cookie would otherwise bounce the user
 * straight back out of `/login` (it treats any cookie as "already signed in").
 * Clearing the cookie server-side before navigating avoids that loop.
 */
let redirectingToLogin = false;

// `client.ts` sits below the React tree (no `useTranslations` here), so this
// message is kept in sync by hand with `auth.sessionExpired` in each
// `messages/*.json` — it only needs to survive the few seconds before the
// redirect below lands on the login page's own (fully localized) banner.
const SESSION_EXPIRED_TEXT: Record<string, string> = {
  en: 'Your session has expired. Please sign in again.',
  th: 'เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
  km: 'សម័យរបស់អ្នកបានផុតកំណត់ សូមចូលគណនីម្តងទៀត',
  lo: 'ເຊດຊັນຂອງທ່ານໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່',
  my: 'သင့်စက်ရှင် သက်တမ်းကုန်သွားပါပြီ ပြန်လည်ဝင်ရောက်ပါ',
};

function handleUnauthorized() {
  if (typeof window === 'undefined' || redirectingToLogin) return;

  const { pathname, search } = window.location;
  if (/^\/(?:[a-z]{2}\/)?(?:login|register)(?:\/|$)/.test(pathname)) return;

  redirectingToLogin = true;

  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  const locale = localeMatch?.[1] ?? 'th';

  pushToast({
    tone: 'danger',
    title: SESSION_EXPIRED_TEXT[locale] ?? SESSION_EXPIRED_TEXT.th,
  });

  void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    .catch(() => undefined)
    .finally(() => {
      const loginPath = localeMatch ? `/${locale}/login` : '/login';
      const next = encodeURIComponent(pathname + search);
      // Give the toast a moment on screen before the hard navigation unmounts it.
      setTimeout(() => {
        window.location.href = `${loginPath}?expired=1&next=${next}`;
      }, 1200);
    });
}

const BASE = '/api/proxy';

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = `${BASE}/${path.replace(/^\/+/, '')}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T>(
  path: string,
  { body, query, idempotencyKey, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    ...init,
    method: init.method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new ApiError(response.status, payload as ApiErrorShape);
  }

  return payload as T;
}

/** RFC 4122 v4 id, used for idempotency keys. */
export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
