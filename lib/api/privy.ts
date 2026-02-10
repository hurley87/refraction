import { NextRequest } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

// Lazy-initialized singleton shared across all API routes
let privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'Missing PRIVY_APP_ID or PRIVY_APP_SECRET environment variables'
      );
    }

    privyClient = new PrivyClient(appId, appSecret);
  }
  return privyClient;
}

/**
 * Verify the Privy auth token from the Authorization header and confirm
 * the authenticated user matches the requested privyUserId.
 */
export async function verifyCallerIdentity(
  req: NextRequest,
  privyUserId: string
): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization token' };
  }

  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);

    if (verifiedClaims.userId !== privyUserId) {
      return { authorized: false, error: 'Unauthorized' };
    }

    return { authorized: true };
  } catch {
    return { authorized: false, error: 'Invalid or expired token' };
  }
}
