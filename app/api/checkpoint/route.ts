import { NextRequest } from "next/server";
import { getActiveCheckpointById } from "@/lib/db/checkpoints";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return apiError("Checkpoint ID is required", 400);
    }

    const checkpoint = await getActiveCheckpointById(id);

    if (!checkpoint) {
      return apiError("Checkpoint not found", 404);
    }

    return apiSuccess({ checkpoint });
  } catch (e) {
    console.error("Error fetching checkpoint:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return apiError(errorMessage, 500);
  }
}
