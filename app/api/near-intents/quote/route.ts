import { NextRequest, NextResponse } from 'next/server';
import type { QuoteRequest, QuoteResponse } from '@/lib/near-intents/types';

const ONECLICK_BASE = 'https://1click.chaindefuser.com';

/**
 * POST /api/near-intents/quote
 * Proxies to 1Click POST /v0/quote. Optional JWT via env NEAR_INTENTS_JWT to avoid 0.2% fee.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuoteRequest;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const jwt = process.env.NEAR_INTENTS_JWT;
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

    const res = await fetch(`${ONECLICK_BASE}/v0/quote`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      const errBody = (data ?? {}) as Record<string, unknown>;
      const message =
        typeof errBody?.message === 'string'
          ? errBody.message
          : typeof errBody?.error === 'string'
            ? errBody.error
            : Array.isArray(errBody?.errors)
              ? (errBody.errors as string[]).join(', ')
              : typeof errBody?.detail === 'string'
                ? errBody.detail
                : res.status === 400
                  ? 'Invalid request. Try another token or amount.'
                  : 'Quote request failed';
      console.error('[near-intents/quote]', res.status, data);
      return NextResponse.json(
        { error: message },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }
    return NextResponse.json(data as QuoteResponse);
  } catch (e) {
    console.error('[near-intents/quote]', e);
    return NextResponse.json(
      { error: 'Quote request failed' },
      { status: 502 }
    );
  }
}
