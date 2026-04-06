import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkAdminPermission } from '@/lib/db/admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return apiError('Email is required', 400);
    }

    const isAdmin = checkAdminPermission(email);

    return apiSuccess({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return apiError('Failed to check admin status', 500);
  }
}
