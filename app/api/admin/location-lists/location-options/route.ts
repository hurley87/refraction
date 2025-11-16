import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminPermission, listLocationOptions } from "@/lib/supabase";

const querySchema = z.object({
  query: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      query: searchParams.get("q") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const locations = await listLocationOptions(parsed.query, parsed.limit);
    return NextResponse.json({ locations });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to fetch location options", error);
    return NextResponse.json(
      { error: "Failed to fetch location options" },
      { status: 500 },
    );
  }
}
