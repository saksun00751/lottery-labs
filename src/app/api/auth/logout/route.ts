import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { publicEnv } from '@/config/env.public';
import { serverEnv } from '@/config/env.server';
import { callUpstream, getAccessToken } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!publicEnv.useMock) {
    const token = await getAccessToken();
    // Best effort: revoke upstream, but always clear the local cookie.
    await callUpstream('auth/logout', { method: 'POST', token });
  }

  const store = await cookies();
  store.delete(serverEnv.sessionCookieName);

  return NextResponse.json({ ok: true });
}
