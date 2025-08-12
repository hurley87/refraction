import { NextRequest, NextResponse } from 'next/server';
import { deleteDiscountCode } from '@/lib/supabase';

// DELETE /api/admin/perks/codes/[codeId] - Delete a discount code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { codeId: string } }
) {
  try {
    await deleteDiscountCode(params.codeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount code' },
      { status: 500 }
    );
  }
}