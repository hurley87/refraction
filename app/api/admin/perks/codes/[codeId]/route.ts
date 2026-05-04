import { NextRequest } from 'next/server';
import { deleteDiscountCode } from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DELETE /api/admin/perks/codes/[codeId] - Delete a discount code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { codeId: string } }
) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    await deleteDiscountCode(params.codeId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return apiError('Failed to delete discount code', 500);
  }
}
