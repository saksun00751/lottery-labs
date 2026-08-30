import { NextResponse } from 'next/server';

import { getAccessToken, callUpstream } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

/** Returns only the channels that the current signed-in member may join. */
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ code: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  const result = await callUpstream('member/realtime-context', { method: 'GET', token });
  return NextResponse.json(result.body, { status: result.status });
}
