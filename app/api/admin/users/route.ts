import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/client';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 1000) {
      return apiError('Invalid pagination parameters', 400);
    }

    // Fetch total count
    const { count: totalCount, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error fetching user count:', countError);
      return apiError('Failed to fetch user count', 500);
    }

    // Fetch paginated users from players table with geo location FKs
    const { data: users, error: usersError } = await supabase
      .from('players')
      .select(
        'id, wallet_address, email, username, total_points, created_at, country_id, geo_city_id, countries(name), geo_cities(name)'
      )
      .order('total_points', { ascending: false })
      .range(offset, offset + limit - 1);

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

    type EmbeddedName = { name: string } | { name: string }[] | null;
    const embeddedName = (value: EmbeddedName): string => {
      if (!value) return '';
      if (Array.isArray(value)) return value[0]?.name?.trim() || '';
      return value.name?.trim() || '';
    };

    // Format user data — city/country from geo FKs only (not legacy text)
    const usersWithStats = users.map((user) => {
      const row = user as {
        id: number;
        wallet_address: string;
        email: string | null;
        username: string | null;
        total_points: number | null;
        created_at: string;
        country_id: string | null;
        geo_city_id: string | null;
        countries: EmbeddedName;
        geo_cities: EmbeddedName;
      };
      return {
        id: row.id,
        wallet_address: row.wallet_address,
        email: row.email || '',
        username: row.username || '',
        total_points: row.total_points || 0,
        created_at: row.created_at,
        country_id: row.country_id,
        geo_city_id: row.geo_city_id,
        country: embeddedName(row.countries),
        city: embeddedName(row.geo_cities),
      };
    });

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
