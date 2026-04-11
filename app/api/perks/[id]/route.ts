import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db/client';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkAdminPermission } from '@/lib/db/admin';
import { getPrivyClient } from '@/lib/api/privy';

export const dynamic = 'force-dynamic';

async function getAuthenticatedAdminEmail(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(verifiedClaims.userId);
    const email = user.email?.address?.trim().toLowerCase();
    if (!email) return null;
    return checkAdminPermission(email) ? email : null;
  } catch {
    return null;
  }
}

// GET /api/perks/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('perks')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    return apiSuccess({ perk: data });
  } catch (error) {
    console.error('GET /api/perks/[id] error:', error);
    return apiError('Failed to fetch perk', 500);
  }
}

// PATCH /api/perks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized', 403);
    }

    const updates = await request.json();
    const { data, error } = await supabase
      .from('perks')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return apiSuccess({ perk: data });
  } catch (error) {
    console.error('PATCH /api/perks/[id] error:', error);
    return apiError('Failed to update perk', 500);
  }
}

// DELETE /api/perks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized', 403);
    }

    const { error } = await supabase.from('perks').delete().eq('id', params.id);
    if (error) throw error;
    return apiSuccess({ success: true });
  } catch (error) {
    console.error('DELETE /api/perks/[id] error:', error);
    return apiError('Failed to delete perk', 500);
  }
}
