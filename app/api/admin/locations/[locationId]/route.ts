import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminPermission, updateLocationById } from "@/lib/supabase";

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
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const locationId = Number(params.locationId);
    if (Number.isNaN(locationId) || locationId <= 0) {
      return NextResponse.json(
        { error: "Invalid location id" },
        { status: 400 },
      );
    }

    const json = await request.json();
    const parsed = updateLocationSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 },
      );
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No update fields provided" },
        { status: 400 },
      );
    }

    const location = await updateLocationById(locationId, updates);
    return NextResponse.json({ location });
  } catch (error) {
    console.error("Failed to update location", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 },
    );
  }
}
