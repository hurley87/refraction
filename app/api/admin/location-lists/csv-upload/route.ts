import { NextRequest } from "next/server";
import { checkAdminPermission } from "@/lib/db/admin";
import { supabase } from "@/lib/db/client";
import { apiSuccess, apiError } from "@/lib/api/response";

const MAPBOX_RATE_LIMIT_MS = 200;
const DESCRIPTION_MAX_LENGTH = 500;
const POINTS_VALUE = 100;

type CsvRow = {
  category: string;
  location: string;
  address: string;
  quote: string;
  imageLink: string;
  recommendedBy: string;
};

type ImportResult = {
  row: number;
  name: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let end = i;
      while (end < line.length && line[end] !== '"') {
        if (line[end] === "\\") end += 2;
        else end += 1;
      }
      fields.push(line.slice(i, end).replace(/""/g, '"'));
      i = end + 1;
      if (line[i] === ",") i += 1;
    } else {
      const comma = line.indexOf(",", i);
      if (comma === -1) {
        fields.push(line.slice(i).trim());
        break;
      }
      fields.push(line.slice(i, comma).trim());
      i = comma + 1;
    }
  }
  return fields;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 5) continue;
    rows.push({
      category: (values[0] ?? "").trim(),
      location: (values[1] ?? "").trim(),
      address: (values[2] ?? "").trim(),
      quote: (values[3] ?? "").trim(),
      imageLink: (values[4] ?? "").trim(),
      recommendedBy: (values[5] ?? "").trim(),
    });
  }
  return rows;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(
  address: string,
  mapboxToken: string
): Promise<[number, number] | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { center: [number, number] }[];
    };
    const center = data.features?.[0]?.center;
    if (!center || center.length < 2) return null;
    return [center[0], center[1]];
  } catch {
    return null;
  }
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let attempt = 0;
  const normalized = base.length > 0 ? base : `list-${Date.now()}`;

  while (attempt < 50) {
    const candidate = attempt === 0 ? normalized : `${normalized}-${attempt}`;
    const { data, error } = await supabase
      .from("location_lists")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    if (!data) return candidate;
    attempt += 1;
  }

  throw new Error("Unable to generate unique slug");
}

/**
 * Resolve an "Image Link" value from the CSV to an uploaded File.
 * Matching is case-insensitive and tries: exact filename, without extension,
 * and just the basename portion of a path.
 */
function resolveImage(
  imageLink: string,
  imageMap: Map<string, File>
): File | undefined {
  if (!imageLink) return undefined;

  const lower = imageLink.toLowerCase();
  if (imageMap.has(lower)) return imageMap.get(lower);

  const withoutExt = lower.replace(/\.[^.]+$/, "");
  if (imageMap.has(withoutExt)) return imageMap.get(withoutExt);

  const basename = lower.split("/").pop();
  if (basename && imageMap.has(basename)) return imageMap.get(basename);

  const basenameNoExt = basename?.replace(/\.[^.]+$/, "");
  if (basenameNoExt && imageMap.has(basenameNoExt))
    return imageMap.get(basenameNoExt);

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const adminEmail = request.headers.get("x-user-email") || undefined;
    if (!checkAdminPermission(adminEmail)) {
      return apiError("Unauthorized", 403);
    }

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      return apiError("Mapbox token not configured", 500);
    }

    const formData = await request.formData();

    const csvFile = formData.get("csv") as File | null;
    const title = formData.get("title") as string | null;
    const listDescription = (formData.get("description") as string) || "";
    const accentColor =
      (formData.get("accentColor") as string) || "#111827";
    const isActive = formData.get("isActive") !== "false";
    const creatorWalletAddress =
      (formData.get("creatorWalletAddress") as string) || "";
    const creatorUsername =
      (formData.get("creatorUsername") as string) || "";

    const imageFiles: File[] = [];
    for (const entry of formData.getAll("images")) {
      if (entry instanceof File) imageFiles.push(entry);
    }

    if (!csvFile) {
      return apiError("CSV file is required", 400);
    }
    if (!title || title.trim().length < 3) {
      return apiError("Title must be at least 3 characters", 400);
    }

    const csvContent = await csvFile.text();
    const rows = parseCsv(csvContent);
    if (rows.length === 0) {
      return apiError("CSV contains no data rows", 400);
    }

    const imageMap = new Map<string, File>();
    for (const file of imageFiles) {
      imageMap.set(file.name.toLowerCase(), file);
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "").toLowerCase();
      if (!imageMap.has(nameWithoutExt)) {
        imageMap.set(nameWithoutExt, file);
      }
    }

    const listSlug = await ensureUniqueSlug(slugify(title.trim()));

    const { data: listData, error: listError } = await supabase
      .from("location_lists")
      .insert({
        title: title.trim(),
        slug: listSlug,
        description: listDescription.trim() || null,
        accent_color: accentColor || null,
        is_active: isActive,
      })
      .select()
      .single();

    if (listError) throw listError;
    const listId = listData.id;

    const results: ImportResult[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = row.location;

      if (!name) {
        results.push({
          row: rowNum,
          name: "(empty)",
          status: "skipped",
          reason: "Missing location name",
        });
        skipped++;
        continue;
      }

      const imageFile = resolveImage(row.imageLink, imageMap);

      if (!imageFile) {
        results.push({
          row: rowNum,
          name,
          status: "skipped",
          reason: "No matching image file found",
        });
        skipped++;
        continue;
      }

      try {
        const locationSlug = slugify(name);
        const ext = imageFile.name.split(".").pop() || "jpg";
        const storagePath = `location-images/${listSlug}-${Date.now()}-${locationSlug}.${ext}`;

        const arrayBuffer = await imageFile.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(storagePath, arrayBuffer, {
            contentType: imageFile.type || "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          results.push({
            row: rowNum,
            name,
            status: "failed",
            reason: `Image upload failed: ${uploadError.message}`,
          });
          failed++;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(storagePath);
        const coinImageUrl = urlData.publicUrl;

        const address = row.address || "";
        let latitude: number | null = null;
        let longitude: number | null = null;

        if (address) {
          const coords = await geocodeAddress(address, mapboxToken);
          if (coords) {
            [longitude, latitude] = coords;
          }
          await sleep(MAPBOX_RATE_LIMIT_MS);
        }

        if (latitude === null || longitude === null) {
          results.push({
            row: rowNum,
            name,
            status: "skipped",
            reason: address
              ? "Address could not be geocoded"
              : "No address provided for geocoding",
          });
          skipped++;
          continue;
        }

        const addressSlug = slugify(address);
        const placeId = addressSlug
          ? `${listSlug}-${locationSlug}-${addressSlug}`
          : `${listSlug}-${locationSlug}-row${rowNum}`;
        const rowDescription =
          row.quote?.slice(0, DESCRIPTION_MAX_LENGTH) || null;

        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .upsert(
            {
              place_id: placeId,
              name,
              address: address || null,
              description: rowDescription,
              latitude,
              longitude,
              points_value: POINTS_VALUE,
              type: row.category?.trim() || null,
              event_url: null,
              context: JSON.stringify({
                recommendedBy: row.recommendedBy || null,
                created_at: new Date().toISOString(),
              }),
              coin_image_url: coinImageUrl,
              creator_wallet_address: creatorWalletAddress || null,
              creator_username: creatorUsername || null,
              is_visible: true,
            },
            { onConflict: "place_id" }
          )
          .select("id")
          .single();

        if (locationError) {
          results.push({
            row: rowNum,
            name,
            status: "failed",
            reason: `Location insert failed: ${locationError.message}`,
          });
          failed++;
          continue;
        }

        const { error: memberError } = await supabase
          .from("location_list_members")
          .insert({ list_id: listId, location_id: locationData.id });

        if (memberError && memberError.code !== "23505") {
          results.push({
            row: rowNum,
            name,
            status: "failed",
            reason: `Failed to add to list: ${memberError.message}`,
          });
          failed++;
          continue;
        }

        results.push({ row: rowNum, name, status: "created" });
        created++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        results.push({ row: rowNum, name, status: "failed", reason: message });
        failed++;
      }
    }

    return apiSuccess({
      list: listData,
      summary: { total: rows.length, created, skipped, failed },
      results,
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return apiError(
      error instanceof Error ? error.message : "Failed to process CSV upload",
      500
    );
  }
}
