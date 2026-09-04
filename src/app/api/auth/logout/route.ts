import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { serverEnv } from '@/config/env.server';
import { callUpstream, getAccessToken } from '@/lib/api/upstream';
import { AUTH_FLAG_COOKIE } from '@/lib/auth-cookie';

export const dynamic = 'force-dynamic';

export async function POST() {
  const token = await getAccessToken();
  // Best effort: revoke upstream, but always clear the local cookie.
  await callUpstream('auth/logout', { method: 'POST', token });

  const store = await cookies();
  store.delete(serverEnv.sessionCookieName);
  store.delete(AUTH_FLAG_COOKIE);

  return NextResponse.json({ ok: true });
}
