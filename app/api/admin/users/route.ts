import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/client';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import {
  buildAdminUserSearchOr,
  formatAdminUserSearchRow,
  type AdminUserSearchRow,
} from '@/lib/db/admin-users-search';

const USER_SELECT =
  'id, wallet_address, email, username, name, bio, profile_picture_url, instagram_handle, total_points, created_at, country_id, geo_city_id, countries(name), geo_cities(name)';

export async function GET(request: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;
    const searchOr = buildAdminUserSearchOr(searchParams.get('q') || '');

    if (page < 1 || limit < 1 || limit > 1000) {
      return apiError('Invalid pagination parameters', 400);
    }

    let countQuery = supabase
      .from('players')
      .select('*', { count: 'exact', head: true });
    let listQuery = supabase
      .from('players')
      .select(USER_SELECT)
      .order('total_points', { ascending: false })
      .range(offset, offset + limit - 1);

    if (searchOr) {
      countQuery = countQuery.or(searchOr);
      listQuery = listQuery.or(searchOr);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Error fetching user count:', countError);
      return apiError('Failed to fetch user count', 500);
    }

    const { data: users, error: usersError } = await listQuery;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return apiError('Failed to fetch users', 500);
    }

    if (!users || users.length === 0) {
      return apiSuccess({
        users: [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
      });
    }

    // Format user data — city/country from geo FKs only (not legacy text).
    const usersWithStats = (users as unknown as AdminUserSearchRow[]).map(
      formatAdminUserSearchRow
    );

    return apiSuccess({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in users admin route:', error);
    return apiError('Internal server error', 500);
  }
}

// POST endpoint to check admin status (verified Privy session only)
export async function POST(request: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    const isAdmin = Boolean(adminEmail);

    return apiSuccess({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return apiError('Failed to check admin status', 500);
  }
}
