import { NextRequest } from "next/server";
import { z } from "zod";
import { checkAdminPermission } from "@/lib/db/admin";
import { updateLocationById } from "@/lib/db/locations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  description: z.string().max(500).nullable().optional(),
  placeId: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  walletAddress: z.string().optional(),
  username: z.string().optional(),
  imageUrl: z.string().url().nullable().optional(),
  type: z.string().optional(),
  eventUrl: z.string().url().nullable().optional(),
  isVisible: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const locationId = Number(params.locationId);
    if (Number.isNaN(locationId) || locationId <= 0) {
      return apiError("Invalid location id", 400);
    }

    const json = await request.json();
    const parsed = updateLocationSchema.safeParse(json);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const payload = parsed.data;
    const updates: Record<string, unknown> = {};

    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.displayName !== undefined)
      updates.display_name = payload.displayName.trim();
    if (payload.description !== undefined)
      updates.description = payload.description?.trim() || null;
    if (payload.placeId !== undefined)
      updates.place_id = payload.placeId.trim();
    if (payload.latitude !== undefined) updates.latitude = payload.latitude;
    if (payload.longitude !== undefined) updates.longitude = payload.longitude;
    if (payload.walletAddress !== undefined)
      updates.creator_wallet_address = payload.walletAddress || null;
    if (payload.username !== undefined)
      updates.creator_username = payload.username || null;
    if (payload.imageUrl !== undefined)
      updates.coin_image_url = payload.imageUrl || null;
    if (payload.type !== undefined) updates.type = payload.type.trim() || null;
    if (payload.eventUrl !== undefined)
      updates.event_url = payload.eventUrl?.trim() || null;
    if (payload.isVisible !== undefined) updates.is_visible = payload.isVisible;

    if (Object.keys(updates).length === 0) {
      return apiError("No update fields provided", 400);
    }

    const location = await updateLocationById(locationId, updates);
    return apiSuccess({ location });
  } catch (error) {
    console.error("Failed to update location", error);
    return apiError("Failed to update location", 500);
  }
}
