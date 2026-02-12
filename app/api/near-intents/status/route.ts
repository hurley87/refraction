import { NextRequest, NextResponse } from 'next/server';
import type { StatusResponse } from '@/lib/near-intents/types';

const ONECLICK_BASE = 'https://1click.chaindefuser.com';

/**
 * GET /api/near-intents/status?depositAddress=...&depositMemo=...
 * Proxies to 1Click GET /v0/status for swap execution status.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const depositAddress = searchParams.get('depositAddress');
    const depositMemo = searchParams.get('depositMemo');
    if (!depositAddress) {
      return NextResponse.json(
        { error: 'depositAddress is required' },
        { status: 400 }
      );
    }
    const url = new URL(`${ONECLICK_BASE}/v0/status`);
    url.searchParams.set('depositAddress', depositAddress);
    if (depositMemo) url.searchParams.set('depositMemo', depositMemo);

    const headers: Record<string, string> = { Accept: 'application/json' };
    const jwt = process.env.NEAR_INTENTS_JWT;
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

    const res = await fetch(url.toString(), { headers });
    const data = (await res.json()) as StatusResponse & { error?: string };
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ status: 'PENDING_DEPOSIT', ...data });
      }
      console.error('[near-intents/status]', res.status, data);
      return NextResponse.json(
        { error: data.error || 'Status check failed' },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('[near-intents/status]', e);
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 502 }
    );
  }
}
