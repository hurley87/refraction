import { NextRequest } from "next/server";
import { checkAdminPermission } from "@/lib/db/admin";
import { supabase } from "@/lib/db/client";
import { getPrivyClient } from "@/lib/api/privy";
import { apiSuccess, apiError } from "@/lib/api/response";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const maxDuration = 60;

const BATCH_SIZE = 5;
const DESCRIPTION_MAX_LENGTH = 500;
const TYPE_MAX_LENGTH = 50;
const POINTS_VALUE = 100;
const DOWNLOAD_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

async function isAuthenticatedAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7).trim();
  if (!token) return false;

  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(verifiedClaims.userId);
    const email = user.email?.address?.trim().toLowerCase();
    if (!email) return false;
    return checkAdminPermission(email);
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local")
  );
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.")
  );
}

function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return false;
}

async function isSafeImageUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (parsed.username || parsed.password) return false;
  if (isLocalHostname(parsed.hostname)) return false;
  if (isPrivateIp(parsed.hostname)) return false;

  try {
    const resolved = await lookup(parsed.hostname, { all: true, verbatim: true });
    if (resolved.length === 0) return false;
    for (const addr of resolved) {
      if (isPrivateIp(addr.address)) return false;
    }
  } catch {
    return false;
  }

  return true;
}

async function readResponseWithLimit(
  res: Response,
  maxBytes: number
): Promise<ArrayBuffer | null> {
  if (!res.body) {
    const fallback = await res.arrayBuffer();
    return fallback.byteLength <= maxBytes ? fallback : null;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged.buffer;
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

const PLACE_ID_MAX = 50;

/**
 * Build a place_id that fits the database varchar(50) constraint.
 * If the full slug would exceed the limit, the suffix is replaced with
 * an 8-char hash of the original full string to preserve uniqueness.
 */
function buildPlaceId(
  listSlug: string,
  locationSlug: string,
  addressSlug: string
): string {
  const full = `${listSlug}-${locationSlug}-${addressSlug}`;
  if (full.length <= PLACE_ID_MAX) return full;

  let hash = 0;
  for (let i = 0; i < full.length; i++) {
    hash = ((hash << 5) - hash + full.charCodeAt(i)) | 0;
  }
  const hashStr = Math.abs(hash).toString(36).slice(0, 8);
  const prefix = `${listSlug}-${locationSlug}`.slice(
    0,
    PLACE_ID_MAX - hashStr.length - 1
  );
  return `${prefix}-${hashStr}`;
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function extractDriveFileId(url: string): string | null {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function downloadImageFromUrl(
  imageUrl: string
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    let targetUrl = imageUrl;

    const driveId = extractDriveFileId(imageUrl);
    if (driveId) {
      targetUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
    }

    const safe = await isSafeImageUrl(targetUrl);
    if (!safe) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    const res = await fetch(targetUrl, {
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return null;

    const contentLengthHeader = res.headers.get("content-length");
    const contentLength = contentLengthHeader
      ? Number.parseInt(contentLengthHeader, 10)
      : null;
    if (contentLength && contentLength > MAX_IMAGE_BYTES) return null;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (contentType.includes("text/html")) return null;
    if (
      !contentType.toLowerCase().startsWith("image/") &&
      !contentType.toLowerCase().startsWith("application/octet-stream")
    ) {
      return null;
    }

    const buffer = await readResponseWithLimit(res, MAX_IMAGE_BYTES);
    if (!buffer) return null;
    if (buffer.byteLength < 200) return null;

    return { buffer, contentType };
  } catch {
    return null;
  }
}

function resolveUploadedImage(
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

type RowContext = {
  listSlug: string;
  listId: string;
  mapboxToken: string;
  imageMap: Map<string, File>;
  creatorWalletAddress: string;
  creatorUsername: string;
};

async function processRow(
  row: CsvRow,
  rowNum: number,
  ctx: RowContext
): Promise<ImportResult> {
  const name = row.location;

  if (!name) {
    return { row: rowNum, name: "(empty)", status: "skipped", reason: "Missing location name" };
  }

  if (!row.imageLink) {
    return { row: rowNum, name, status: "skipped", reason: "No image link provided" };
  }

  try {
    const locationSlug = slugify(name);
    const address = row.address || "";
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (address) {
      const coords = await geocodeAddress(address, ctx.mapboxToken);
      if (coords) {
        [longitude, latitude] = coords;
      }
    }

    if (latitude === null || longitude === null) {
      return {
        row: rowNum,
        name,
        status: "skipped",
        reason: address
          ? "Address could not be geocoded"
          : "No address provided for geocoding",
      };
    }

    let imageBytes: ArrayBuffer;
    let imageContentType: string;
    let imageExt: string;

    if (isUrl(row.imageLink)) {
      const downloaded = await downloadImageFromUrl(row.imageLink);
      if (!downloaded) {
        return { row: rowNum, name, status: "skipped", reason: "Image URL could not be downloaded" };
      }
      imageBytes = downloaded.buffer;
      imageContentType = downloaded.contentType;
      imageExt = imageContentType.split("/")[1]?.split(";")[0] || "jpg";
    } else {
      const imageFile = resolveUploadedImage(row.imageLink, ctx.imageMap);
      if (!imageFile) {
        return { row: rowNum, name, status: "skipped", reason: "No matching image file found" };
      }
      imageBytes = await imageFile.arrayBuffer();
      imageContentType = imageFile.type || "image/jpeg";
      imageExt = imageFile.name.split(".").pop() || "jpg";
    }

    const storagePath = `location-images/${ctx.listSlug}-r${rowNum}-${locationSlug}.${imageExt}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(storagePath, imageBytes, {
        contentType: imageContentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { row: rowNum, name, status: "failed", reason: `Image upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(storagePath);
    const coinImageUrl = urlData.publicUrl;

    const addressSlug = slugify(address);
    const placeId = buildPlaceId(
      ctx.listSlug,
      locationSlug,
      addressSlug || `row${rowNum}`
    );
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
          type: row.category?.trim().slice(0, TYPE_MAX_LENGTH) || null,
          event_url: null,
          context: JSON.stringify({
            recommendedBy: row.recommendedBy || null,
            created_at: new Date().toISOString(),
          }),
          coin_image_url: coinImageUrl,
          creator_wallet_address: ctx.creatorWalletAddress || null,
          creator_username: ctx.creatorUsername || null,
          is_visible: true,
        },
        { onConflict: "place_id" }
      )
      .select("id")
      .single();

    if (locationError) {
      return { row: rowNum, name, status: "failed", reason: `Location insert failed: ${locationError.message}` };
    }

    const { error: memberError } = await supabase
      .from("location_list_members")
      .insert({ list_id: ctx.listId, location_id: locationData.id });

    if (memberError && memberError.code !== "23505") {
      return { row: rowNum, name, status: "failed", reason: `Failed to add to list: ${memberError.message}` };
    }

    return { row: rowNum, name, status: "created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { row: rowNum, name, status: "failed", reason: message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAuthenticatedAdmin(request);
    if (!isAdmin) {
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

    const ctx: RowContext = {
      listSlug,
      listId: listData.id,
      mapboxToken,
      imageMap,
      creatorWalletAddress,
      creatorUsername,
    };

    const results: ImportResult[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((row, idx) => processRow(row, i + idx + 2, ctx))
      );
      for (const result of batchResults) {
        results.push(result);
        if (result.status === "created") created++;
        else if (result.status === "skipped") skipped++;
        else failed++;
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
