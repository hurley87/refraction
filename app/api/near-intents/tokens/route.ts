import { NextResponse } from 'next/server';
import type { OneClickToken } from '@/lib/near-intents/types';

const ONECLICK_BASE = 'https://1click.chaindefuser.com';

/**
 * GET /api/near-intents/tokens
 * Proxies to 1Click GET /v0/tokens. Returns supported tokens for swaps.
 */
export async function GET() {
  try {
    const res = await fetch(`${ONECLICK_BASE}/v0/tokens`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[near-intents/tokens]', res.status, text);
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 502 }
      );
    }
    const data = (await res.json()) as OneClickToken[];
    return NextResponse.json(data);
  } catch (e) {
    console.error('[near-intents/tokens]', e);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 502 }
    );
  }
}
