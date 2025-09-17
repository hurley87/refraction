import { NextRequest, NextResponse } from 'next/server';

// Admin emails allowlist
const ADMIN_EMAILS = [
  "dhurls99@gmail.com",
  "kaitlyn@refractionfestival.com",
  "jim@refractionfestival.com",
];

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', isAdmin: false },
        { status: 400 }
      );
    }

    const isAdmin = ADMIN_EMAILS.includes(email);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status', isAdmin: false },
      { status: 500 }
    );
  }
}