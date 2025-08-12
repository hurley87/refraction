import { NextRequest, NextResponse } from 'next/server';
import { updatePerk, deletePerk, type Perk } from '@/lib/supabase';

// PUT /api/admin/perks/[id] - Update a perk
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const perk = await updatePerk(params.id, body as Partial<Perk>);
    return NextResponse.json({ perk });
  } catch (error) {
    console.error('Error updating perk:', error);
    return NextResponse.json(
      { error: 'Failed to update perk' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/perks/[id] - Delete a perk
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deletePerk(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting perk:', error);
    return NextResponse.json(
      { error: 'Failed to delete perk' },
      { status: 500 }
    );
  }
}