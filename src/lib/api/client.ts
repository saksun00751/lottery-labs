import type { ApiErrorShape } from '@/types';

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
