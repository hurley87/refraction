import { NextRequest, NextResponse } from "next/server";
import {
  getCheckpointById,
  updateCheckpoint,
  deleteCheckpoint,
} from "@/lib/db/checkpoints";
import { updateCheckpointRequestSchema } from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";

interface RouteParams {
  params: { id: string };
}

// GET /api/admin/checkpoints/[id] - Get a checkpoint by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const checkpoint = await getCheckpointById(params.id);

    if (!checkpoint) {
      return apiError("Checkpoint not found", 404);
    }

    return NextResponse.json({ checkpoint });
  } catch (error) {
    console.error("Error fetching checkpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch checkpoint" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/checkpoints/[id] - Update a checkpoint
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const validationResult = updateCheckpointRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    const checkpoint = await updateCheckpoint(params.id, validationResult.data);

    return apiSuccess({ checkpoint }, "Checkpoint updated successfully");
  } catch (error) {
    console.error("Error updating checkpoint:", error);
    return apiError("Failed to update checkpoint", 500);
  }
}

// DELETE /api/admin/checkpoints/[id] - Delete a checkpoint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await deleteCheckpoint(params.id);

    return apiSuccess({ deleted: true }, "Checkpoint deleted successfully");
  } catch (error) {
    console.error("Error deleting checkpoint:", error);
    return apiError("Failed to delete checkpoint", 500);
  }
}
