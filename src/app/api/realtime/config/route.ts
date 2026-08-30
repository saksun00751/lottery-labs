import { NextResponse } from 'next/server';

import { callUpstream } from '@/lib/api/upstream';

export const dynamic = 'force-dynamic';

/** Public WebSocket connection settings (Pusher app key, host and ports). */
export async function GET() {
  const result = await callUpstream('realtime/config', { method: 'GET' });
  return NextResponse.json(result.body, { status: result.status });
}
