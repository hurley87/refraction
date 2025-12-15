import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminPermission } from "@/lib/db/admin";
import {
  addLocationToList,
  getLocationsForList,
  removeLocationFromList,
} from "@/lib/db/location-lists";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const locations = await getLocationsForList(params.listId);
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Failed to fetch list locations", error);
    return NextResponse.json(
      { error: "Failed to fetch list locations" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const json = await request.json();
    const { locationId } = addSchema.parse(json);

    const membership = await addLocationToList(params.listId, locationId);
    return NextResponse.json({ membership });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", issues: error.issues },
        { status: 400 },
      );
    }

    if (isDuplicateError(error)) {
      return NextResponse.json(
        { error: "Location is already on this list" },
        { status: 409 },
      );
    }

    console.error("Failed to add location to list", error);
    return NextResponse.json(
      { error: "Failed to add location" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = removeSchema.safeParse({
      locationId: searchParams.get("locationId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "locationId is required" },
        { status: 400 },
      );
    }

    await removeLocationFromList(params.listId, parsed.data.locationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove location from list", error);
    return NextResponse.json(
      { error: "Failed to remove location" },
      { status: 500 },
    );
  }
}
