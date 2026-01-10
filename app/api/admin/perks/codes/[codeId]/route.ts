import { NextRequest } from 'next/server';
import { deleteDiscountCode } from '@/lib/db/perks';
import { apiSuccess, apiError } from '@/lib/api/response';

// DELETE /api/admin/perks/codes/[codeId] - Delete a discount code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { codeId: string } }
) {
  try {
    await deleteDiscountCode(params.codeId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return apiError('Failed to delete discount code', 500);
  }
}