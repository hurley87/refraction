import { createHmac, timingSafeEqual } from 'crypto';

const TTL_MS = 60 * 60 * 1000; // 1 hour

type PreviewPayload = {
  guideId: string;
  slug: string;
  exp: number;
};

function getSecret(): string | null {
  if (process.env.GUIDE_PREVIEW_SECRET?.trim()) {
    return process.env.GUIDE_PREVIEW_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'development') {
    return 'dev-guide-preview-secret';
  }
  return null;
}

/**
 * HMAC-signed token: `{ guideId, slug, exp }` — use only for admin-issued draft preview URLs.
 */
export function createGuidePreviewToken(
  guideId: string,
  slug: string
): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + TTL_MS;
  const body: PreviewPayload = { guideId, slug, exp };
  const payload = Buffer.from(JSON.stringify(body), 'utf8').toString(
    'base64url'
  );
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyGuidePreviewToken(
  token: string
): { guideId: string; slug: string } | null {
  const secret = getSecret();
  if (!secret) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  let body: PreviewPayload;
  try {
    const raw = Buffer.from(payload, 'base64url').toString('utf8');
    body = JSON.parse(raw) as PreviewPayload;
  } catch {
    return null;
  }
  if (
    typeof body.guideId !== 'string' ||
    typeof body.slug !== 'string' ||
    typeof body.exp !== 'number'
  ) {
    return null;
  }
  if (Date.now() > body.exp) return null;
  return { guideId: body.guideId, slug: body.slug };
}

export function isGuidePreviewSecretConfigured(): boolean {
  return getSecret() != null;
}
