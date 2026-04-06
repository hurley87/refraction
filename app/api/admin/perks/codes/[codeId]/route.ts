import { NextRequest } from 'next/server';
import { deleteDiscountCode } from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';
import { checkAdminPermission } from '@/lib/db/admin';

export const dynamic = 'force-dynamic';

// DELETE /api/admin/perks/codes/[codeId] - Delete a discount code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { codeId: string } }
) {
  try {
    const adminEmail = request.headers.get('x-user-email') || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    await deleteDiscountCode(params.codeId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return apiError('Failed to delete discount code', 500);
  }
}
