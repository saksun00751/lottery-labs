import { NextResponse } from 'next/server';

import { getAccessToken, callUpstream } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

/** Keeps the member's online presence alive while a realtime session is open. */
export async function POST() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ code: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  const result = await callUpstream('member/heartbeat', {
    method: 'POST',
    token,
    body: '{}',
    contentType: 'application/json',
  });
  return NextResponse.json(result.body, { status: result.status });
}
