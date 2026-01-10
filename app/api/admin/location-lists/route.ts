import { NextRequest } from "next/server";
import { z } from "zod";
import { checkAdminPermission } from "@/lib/db/admin";
import { createLocationList, getLocationLists } from "@/lib/db/location-lists";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";

const colorRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const createListSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  accentColor: z.string().regex(colorRegex, "Invalid color").optional(),
  isActive: z.boolean().optional(),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureUniqueSlug = async (base: string): Promise<string> => {
  let attempt = 0;
  const normalized = base.length > 0 ? base : `list-${Date.now()}`;

  while (attempt < 50) {
    const candidate = attempt === 0 ? normalized : `${normalized}-${attempt}`;
    const { data, error } = await supabase
      .from("location_lists")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    attempt += 1;
  }

  throw new Error("Unable to generate unique slug");
};

export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const lists = await getLocationLists();
    return apiSuccess({ lists });
  } catch (error) {
    console.error("Failed to fetch location lists", error);
    return apiError("Failed to fetch location lists", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const json = await request.json();
    const payload = createListSchema.parse(json);
    const slug = await ensureUniqueSlug(slugify(payload.title));

    const list = await createLocationList({
      title: payload.title.trim(),
      slug,
      description: payload.description?.trim() || null,
      accent_color: payload.accentColor,
      is_active: payload.isActive ?? true,
    });

    return apiSuccess({ list });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }

    console.error("Failed to create location list", error);
    return apiError("Failed to create location list", 500);
  }
}
