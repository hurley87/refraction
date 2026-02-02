import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { fetchEvents, DiceApiError } from "@/lib/dice";

export const dynamic = "force-dynamic";

// GET /api/dice/events
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const first = searchParams.get("first");
  const after = searchParams.get("after");

  try {
    const result = await fetchEvents({
      first: first ? parseInt(first, 10) : undefined,
      after: after || undefined,
    });

    return apiSuccess(result);
  } catch (error) {
    console.error("GET /api/dice/events error:", error);

    if (error instanceof DiceApiError) {
      const status = error.statusCode as 400 | 401 | 404 | 429 | 500;
      return apiError(error.message, status);
    }

    return apiError("Failed to fetch events", 500);
  }
}
