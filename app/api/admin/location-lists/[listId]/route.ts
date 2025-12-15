import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminPermission } from "@/lib/db/admin";
import { deleteLocationList, updateLocationList } from "@/lib/db/location-lists";

const colorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const updateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  accentColor: z.string().regex(colorRegex, "Invalid color").optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { listId: string } },
) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const json = await request.json();
    const payload = updateSchema.parse(json);

    const updates: Record<string, unknown> = {};
    if (payload.title !== undefined) {
      updates.title = payload.title.trim();
    }
    if (payload.description !== undefined) {
      updates.description = payload.description?.trim() || null;
    }
    if (payload.accentColor !== undefined) {
      updates.accent_color = payload.accentColor;
    }
    if (payload.isActive !== undefined) {
      updates.is_active = payload.isActive;
    }

    const list = await updateLocationList(params.listId, updates);
    return NextResponse.json({ list });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to update location list", error);
    return NextResponse.json(
      { error: "Failed to update location list" },
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

    await deleteLocationList(params.listId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete location list", error);
    return NextResponse.json(
      { error: "Failed to delete location list" },
      { status: 500 },
    );
  }
}
