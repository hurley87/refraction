import { NextRequest } from "next/server";
import { updatePerk, deletePerk } from "@/lib/db/perks";
import type { Perk } from "@/lib/types";
import { apiSuccess, apiError } from "@/lib/api/response";

// PUT /api/admin/perks/[id] - Update a perk
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();

    const normalizedBody = {
      ...body,
      ...(body.end_date !== undefined && {
        end_date:
          typeof body.end_date === "string" && body.end_date.trim() !== ""
            ? body.end_date
            : null,
      }),
    };

    const perk = await updatePerk(params.id, normalizedBody as Partial<Perk>);
    return apiSuccess({ perk });
  } catch (error) {
    console.error("Error updating perk:", error);
    return apiError("Failed to update perk", 500);
  }
}

// DELETE /api/admin/perks/[id] - Delete a perk
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await deletePerk(params.id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("Error deleting perk:", error);
    return apiError("Failed to delete perk", 500);
  }
}
