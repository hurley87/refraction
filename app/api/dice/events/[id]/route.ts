import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { fetchEvent, DiceApiError } from "@/lib/dice";

export const dynamic = "force-dynamic";

// GET /api/dice/events/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || id.trim() === "") {
    return apiError("Event ID is required", 400);
  }

  try {
    const event = await fetchEvent(id);
    return apiSuccess({ event });
  } catch (error) {
    console.error("GET /api/dice/events/[id] error:", error);

    if (error instanceof DiceApiError) {
      const status = error.statusCode as 400 | 401 | 404 | 429 | 500;
      return apiError(error.message, status);
    }

    return apiError("Failed to fetch event", 500);
  }
}
