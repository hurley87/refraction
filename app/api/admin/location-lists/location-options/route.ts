import { NextRequest } from "next/server";
import { z } from "zod";
import { checkAdminPermission } from "@/lib/db/admin";
import { listLocationOptions } from "@/lib/db/locations";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";

const querySchema = z.object({
  query: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      query: searchParams.get("q") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const locations = await listLocationOptions(parsed.query, parsed.limit);
    return apiSuccess({ locations });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }

    console.error("Failed to fetch location options", error);
    return apiError("Failed to fetch location options", 500);
  }
}
