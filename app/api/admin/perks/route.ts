import { NextRequest } from 'next/server';
import { getAllPerks, createPerk } from '@/lib/db/perks';
import type { Perk } from '@/lib/types';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkAdminPermission } from '@/lib/db/admin';

export const dynamic = 'force-dynamic';

// GET /api/admin/perks - Get all perks
export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const perks = await getAllPerks(activeOnly);
    return apiSuccess({ perks });
  } catch (error) {
    console.error('Error fetching perks:', error);
    return apiError('Failed to fetch perks', 500);
  }
}

// POST /api/admin/perks - Create a new perk
export async function POST(request: NextRequest) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const body = await request.json();

    // Normalize empty strings to null for optional date fields
    const normalizedBody = {
      ...body,
      end_date:
        typeof body.end_date === 'string' && body.end_date.trim() !== ''
          ? body.end_date
          : null,
    };

    const perk = await createPerk(
      normalizedBody as Omit<Perk, 'id' | 'created_at' | 'updated_at'>
    );
    return apiSuccess({ perk });
  } catch (error) {
    console.error('Error creating perk:', error);
    return apiError('Failed to create perk', 500);
  }
}
