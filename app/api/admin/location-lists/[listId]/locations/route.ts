import { NextRequest } from "next/server";
import { z } from "zod";
import { checkAdminPermission } from "@/lib/db/admin";
import {
  addLocationToList,
  getLocationsForList,
  removeLocationFromList,
} from "@/lib/db/location-lists";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";

const addSchema = z.object({
  locationId: z.coerce.number().int().positive(),
});

const removeSchema = z.object({
  locationId: z.coerce.number().int().positive(),
});

const isDuplicateError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "23505";

export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const locations = await getLocationsForList(params.listId);
    return apiSuccess({ locations });
  } catch (error) {
    console.error("Failed to fetch list locations", error);
    return apiError("Failed to fetch list locations", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const json = await request.json();
    const { locationId } = addSchema.parse(json);

    const membership = await addLocationToList(params.listId, locationId);
    return apiSuccess({ membership });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }

    if (isDuplicateError(error)) {
      return apiError("Location is already on this list", 409);
    }

    console.error("Failed to add location to list", error);
    return apiError("Failed to add location", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const { searchParams } = new URL(request.url);
    const parsed = removeSchema.safeParse({
      locationId: searchParams.get("locationId"),
    });

    if (!parsed.success) {
      return apiError("locationId is required", 400);
    }

    await removeLocationFromList(params.listId, parsed.data.locationId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Failed to remove location from list", error);
    return apiError("Failed to remove location", 500);
  }
}
