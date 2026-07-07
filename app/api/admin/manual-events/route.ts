import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
import { getAuthenticatedAdminEmail } from '@/lib/auth';
import {
  listManualEvents,
  createManualEvent,
  updateManualEvent,
  deleteManualEvent,
  HomepageFeaturedCapError,
} from '@/lib/db/manual-events';

const manualEventFields = z.object({
  title: z.string().min(1, 'Title is required'),
  thumbnailUrl: z.string().default(''),
  date: z.string().min(1, 'Date is required'),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value && value.trim() ? value : null)),
  city: z.string().min(1, 'City is required'),
  mapsLink: z.string().default(''),
  rsvpLink: z.string().default(''),
  hosted: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  cityId: z.string().uuid('Invalid city').nullable().default(null),
});

const endOnOrAfterStart = (data: { date: string; endDate: string | null }) =>
  !data.endDate || new Date(data.endDate) >= new Date(data.date);

const endDateError = {
  message: 'End date must be on or after the start date',
  path: ['endDate'],
};

const manualEventSchema = manualEventFields.refine(
  endOnOrAfterStart,
  endDateError
);

const manualEventUpdateSchema = manualEventFields
  .extend({ id: z.string().uuid('Invalid event ID') })
  .refine(endOnOrAfterStart, endDateError);

/** GET /api/admin/manual-events — list all manual events */
export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  try {
    const events = await listManualEvents();
    return apiSuccess(events);
  } catch (e) {
    console.error('Failed to list manual events:', e);
    return apiError('Failed to load manual events', 500);
  }
}

/** POST /api/admin/manual-events — create a new manual event */
export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = manualEventSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const created = await createManualEvent(parsed.data);
    return apiSuccess(created, 'Event created', 201);
  } catch (e) {
    if (e instanceof HomepageFeaturedCapError) {
      return apiError(e.message, 409);
    }
    console.error('Failed to create manual event:', e);
    return apiError('Failed to create event', 500);
  }
}

/** PUT /api/admin/manual-events — update an existing manual event (id in body) */
export async function PUT(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = manualEventUpdateSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { id, ...fields } = parsed.data;
  try {
    const updated = await updateManualEvent(id, fields);
    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof HomepageFeaturedCapError) {
      return apiError(e.message, 409);
    }
    console.error('Failed to update manual event:', e);
    return apiError('Failed to update event', 500);
  }
}

/** DELETE /api/admin/manual-events — delete a manual event (id in body) */
export async function DELETE(request: NextRequest) {
  const admin = await getAuthenticatedAdminEmail(request);
  if (!admin) return apiError('Unauthorized', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', 400);
  }

  const parsed = z
    .object({ id: z.string().uuid('Invalid event ID') })
    .safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    await deleteManualEvent(parsed.data.id);
    return apiSuccess({ deleted: parsed.data.id });
  } catch (e) {
    console.error('Failed to delete manual event:', e);
    return apiError('Failed to delete event', 500);
  }
}
