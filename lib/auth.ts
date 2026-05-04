import { NextRequest } from 'next/server';
import { checkAdminPermission } from '@/lib/db/admin';
import { getPrivyUserEmailFromRequest } from '@/lib/api/privy';

export { checkAdminPermission };

/**
 * Authenticated user (email from verified Privy JWT only).
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<{ email?: string } | null> {
  const email = await getPrivyUserEmailFromRequest(request);
  if (!email) {
    return null;
  }
  return { email };
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

/**
 * Email of an admin user, or null if missing/invalid token or caller is not in {@link ADMIN_EMAILS}.
 */
export async function getAuthenticatedAdminEmail(
  request: NextRequest
): Promise<string | null> {
  const email = await getPrivyUserEmailFromRequest(request);
  if (!email || !checkAdminPermission(email)) {
    return null;
  }
  return email;
}
