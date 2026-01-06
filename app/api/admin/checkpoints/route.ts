import { NextRequest, NextResponse } from "next/server";
import { listAllCheckpoints, createCheckpoint } from "@/lib/db/checkpoints";
import { createCheckpointRequestSchema } from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";

// GET /api/admin/checkpoints - Get all checkpoints
export async function GET() {
  try {
    const checkpoints = await listAllCheckpoints();
    return NextResponse.json({ checkpoints });
  } catch (error) {
    console.error("Error fetching checkpoints:", error);
    return NextResponse.json(
      { error: "Failed to fetch checkpoints" },
      { status: 500 },
    );
  }
}

// POST /api/admin/checkpoints - Create a new checkpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createCheckpointRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error);
    }

    // Get admin email from header (set by middleware)
    const adminEmail = request.headers.get("x-user-email") || undefined;

    const checkpoint = await createCheckpoint({
      ...validationResult.data,
      created_by: adminEmail,
    });

    // Return the checkpoint with the URL for easy copying
    const checkpointUrl = `/c/${checkpoint.id}`;

    return apiSuccess(
      { checkpoint, url: checkpointUrl },
      `Checkpoint created! URL: ${checkpointUrl}`,
    );
  } catch (error) {
    console.error("Error creating checkpoint:", error);
    return apiError("Failed to create checkpoint", 500);
  }
}
