import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getPrivyUserEmailFromRequest } from '@/lib/api/privy';
import { checkAdminPermission } from '@/lib/db/admin';

export async function POST(request: NextRequest) {
  try {
    const email = await getPrivyUserEmailFromRequest(request);
    if (!email) {
      return apiError('Unauthorized', 403);
    }

    const isAdmin = checkAdminPermission(email);

    return apiSuccess({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return apiError('Failed to check admin status', 500);
  }
}
