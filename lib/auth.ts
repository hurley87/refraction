import { NextRequest } from 'next/server';
import { checkAdminPermission } from '@/lib/db/admin';

export { checkAdminPermission };

// Extract user email from Privy token (simplified for now)
export async function getUserFromRequest(
  request: NextRequest
): Promise<{ email?: string } | null> {
  try {
    // For now, we'll use a simple approach - you can enhance this to properly verify Privy JWT tokens
    const userEmail = request.headers.get('x-user-email'); // Frontend can send this after Privy auth

    if (!userEmail) {
      return null;
    }

    return { email: userEmail };
  } catch (error) {
    console.error('Error extracting user from request:', error);
    return null;
  }
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ isValid: boolean; user?: { email: string } }> {
  const user = await getUserFromRequest(request);

  if (!user?.email) {
    return { isValid: false };
  }

  if (!checkAdminPermission(user.email)) {
    return { isValid: false, user: { email: user.email } };
  }

  return { isValid: true, user: { email: user.email } };
}
