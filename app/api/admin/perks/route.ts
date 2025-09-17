import { NextRequest, NextResponse } from 'next/server';
import { getAllPerks, createPerk, type Perk } from '@/lib/supabase';

// GET /api/admin/perks - Get all perks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const perks = await getAllPerks(activeOnly);
    return NextResponse.json({ perks });
  } catch (error) {
    console.error('Error fetching perks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch perks' },
      { status: 500 }
    );
  }
}

// POST /api/admin/perks - Create a new perk
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const perk = await createPerk(body as Omit<Perk, "id" | "created_at" | "updated_at">);
    return NextResponse.json({ perk });
  } catch (error) {
    console.error('Error creating perk:', error);
    return NextResponse.json(
      { error: 'Failed to create perk' },
      { status: 500 }
    );
  }
}