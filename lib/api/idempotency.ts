import type { NextRequest } from 'next/server';

/**
 * Reads `idempotency-key` / `x-idempotency-key` for admin POST creates, or generates a UUID.
 * Matches spend experience admin create behavior.
 */
export function adminCreateIdempotencyKey(request: NextRequest): string {
  return (
    request.headers.get('idempotency-key') ??
    request.headers.get('x-idempotency-key') ??
    crypto.randomUUID()
  ).trim();
}
