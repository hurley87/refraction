import { NextRequest, NextResponse } from 'next/server';
import { listAllLocations } from '@/lib/db/locations';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import { apiError } from '@/lib/api/response';
import type { Location } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Quote a CSV cell, escaping embedded quotes and coercing null/undefined to ''. */
const cell = (value: unknown): string =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

// GET /api/admin/locations/export - Download all locations as CSV
export async function GET(request: NextRequest) {
  try {
    const adminEmail = await getAuthenticatedAdminEmail(request);
    if (!adminEmail) {
      return apiError('Unauthorized - Admin access required', 403);
    }

    // Embedded `category` is a single object at runtime (many-to-one join),
    // but supabase-js statically infers it as an array.
    const locations = (await listAllLocations()) as unknown as Location[];

    const header = ['Name', 'Address', 'City', 'Description'].join(',');
    const lines = locations.map((location) =>
      [
        cell(location.name),
        cell(location.address),
        cell(location.city),
        cell(location.description),
      ].join(',')
    );
    // Prepend a UTF-8 BOM so Excel renders accented characters correctly.
    const csv = '\uFEFF' + [header, ...lines].join('\r\n');

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="locations-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting locations:', error);
    return apiError('Failed to export locations', 500);
  }
}
