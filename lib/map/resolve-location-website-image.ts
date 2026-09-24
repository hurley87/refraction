import { uploadProcessedLocationImages } from '@/lib/utils/upload-location-image';

const HTML_TIMEOUT_MS = 3_000;
const IMAGE_TIMEOUT_MS = 3_000;
const OVERALL_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const BLOCKED_IMAGE_HOST_SUFFIXES = [
  'google.com',
  'googleusercontent.com',
  'gstatic.com',
  'ggpht.com',
];

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type LocationWebsiteImageUrls = {
  imageUrl: string;
  thumbnailUrl: string;
};

const LOG_PREFIX = '[location-image]';

function logStep(step: string, details?: Record<string, unknown>): void {
  if (details) {
    console.log(`${LOG_PREFIX} ${step}`, details);
    return;
  }
  console.log(`${LOG_PREFIX} ${step}`);
}

function logSkip(reason: string, details?: Record<string, unknown>): null {
  console.warn(`${LOG_PREFIX} skipped: ${reason}`, details ?? {});
  return null;
}

export type ExtractedPageImage = {
  url: string;
  /** Which part of the page the candidate came from, for logging. */
  source: 'og:image' | 'twitter:image' | 'image_src' | 'json-ld' | 'img-tag';
};

/**
 * Picks the best representative image on a page, preferring explicit social
 * metadata and falling back to structured data and finally to the largest
 * inline `<img>`. Plenty of small-business sites ship no social tags at all.
 */
export function extractPageImage(
  html: string,
  pageUrl: string
): ExtractedPageImage | null {
  const candidates: Array<{
    raw: string | null;
    source: ExtractedPageImage['source'];
  }> = [
    { raw: matchMetaContent(html, 'property', 'og:image'), source: 'og:image' },
    {
      raw:
        matchMetaContent(html, 'name', 'twitter:image') ||
        matchMetaContent(html, 'name', 'twitter:image:src'),
      source: 'twitter:image',
    },
    { raw: matchLinkHref(html, 'image_src'), source: 'image_src' },
    { raw: extractJsonLdImage(html), source: 'json-ld' },
    { raw: extractLargestImgSrc(html), source: 'img-tag' },
  ];

  for (const candidate of candidates) {
    if (!candidate.raw) continue;
    try {
      const url = new URL(candidate.raw.trim(), pageUrl).href;
      return { url, source: candidate.source };
    } catch {
      continue;
    }
  }

  return null;
}

export function extractWebsiteFromMapboxRetrieve(
  payload: unknown
): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features) || features.length === 0) return null;
  const props = (features[0] as { properties?: Record<string, unknown> })
    ?.properties;
  if (!props || typeof props !== 'object') return null;

  const metadata = props.metadata;
  if (metadata && typeof metadata === 'object') {
    const website = (metadata as { website?: unknown }).website;
    if (typeof website === 'string' && website.trim()) {
      return website.trim();
    }
  }

  const direct = props.website;
  return typeof direct === 'string' && direct.trim() ? direct.trim() : null;
}

export function normalizeHttpsWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'https:') return null;
    if (isBlockedFetchUrl(parsed.href)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function isBlockedFetchUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return true;
  }

  if (parsed.protocol !== 'https:') return true;

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname === '::1' || hostname === '0.0.0.0') return true;
  if (isPrivateOrReservedHostname(hostname)) return true;
  if (isBlockedGoogleImageHost(hostname)) return true;

  return false;
}

function isBlockedGoogleImageHost(hostname: string): boolean {
  return BLOCKED_IMAGE_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
}

function isPrivateOrReservedHostname(hostname: string): boolean {
  if (hostname === 'metadata.google.internal') return true;

  const ipv4 = hostname.startsWith('::ffff:')
    ? hostname.slice('::ffff:'.length)
    : hostname;

  const parts = ipv4.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  if (hostname.includes(':')) {
    const compact = hostname.toLowerCase();
    if (
      compact === '::1' ||
      compact.startsWith('fe80:') ||
      compact.startsWith('fc') ||
      compact.startsWith('fd')
    ) {
      return true;
    }
  }

  return false;
}

function matchMetaContent(
  html: string,
  attr: 'property' | 'name',
  value: string
): string | null {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]+${attr}\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]*${attr}\\s*=\\s*["']${escaped}["'][^>]*>`,
      'i'
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function matchLinkHref(html: string, rel: string): string | null {
  const match = html.match(
    new RegExp(
      `<link[^>]+rel\\s*=\\s*["']${rel}["'][^>]*href\\s*=\\s*["']([^"']+)["']`,
      'i'
    )
  );
  return match?.[1]?.trim() || null;
}

/** Pulls the first usable schema.org `image` value out of JSON-LD blocks. */
function extractJsonLdImage(html: string): string | null {
  const blocks = html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }

    const found = findJsonLdImage(parsed);
    if (found) return found;
  }
  return null;
}

function findJsonLdImage(node: unknown, depth = 0): string | null {
  if (depth > 5 || !node || typeof node !== 'object') return null;

  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = findJsonLdImage(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = node as Record<string, unknown>;
  const image = record.image;
  const direct = firstImageString(image);
  if (direct) return direct;

  for (const value of Object.values(record)) {
    const found = findJsonLdImage(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function firstImageString(image: unknown): string | null {
  if (typeof image === 'string' && image.trim()) return image.trim();
  if (Array.isArray(image)) {
    for (const entry of image) {
      const found = firstImageString(entry);
      if (found) return found;
    }
    return null;
  }
  if (image && typeof image === 'object') {
    const url = (image as { url?: unknown }).url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return null;
}

/**
 * Last resort: the widest `<img>` that declares usable dimensions. Skips
 * sprites, logos, tracking pixels, and low-quality placeholders.
 */
function extractLargestImgSrc(html: string): string | null {
  let best: { src: string; width: number } | null = null;

  for (const tag of html.matchAll(/<img[^>]+>/gi)) {
    const markup = tag[0];
    const src = markup.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1]?.trim();
    if (!src || src.startsWith('data:')) continue;
    if (looksLikeNonPhoto(src)) continue;

    const width = Number(markup.match(/\swidth\s*=\s*["']?(\d+)/i)?.[1] ?? 0);
    const height = Number(markup.match(/\sheight\s*=\s*["']?(\d+)/i)?.[1] ?? 0);
    if (width < 300 || height < 200) continue;

    if (!best || width > best.width) best = { src, width };
  }

  return best?.src ?? null;
}

function looksLikeNonPhoto(src: string): boolean {
  const lower = src.toLowerCase();
  return (
    lower.endsWith('.svg') ||
    /\b(logo|icon|sprite|pixel|spacer|avatar|badge)\b/.test(lower) ||
    // Wix/Squarespace style low-quality placeholders rendered before the real
    // asset loads; they decode to a handful of blurred pixels.
    /[?,/]blur_\d/.test(lower) ||
    /[?,/]w_(?:[1-9]|[1-9]\d|1\d\d)[,/]/.test(lower)
  );
}

async function fetchRedirectSafe(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  maxBytes: number,
  label: string,
  /**
   * HTML pages routinely exceed the byte cap, but the metadata we need lives in
   * `<head>`, so we stop reading and parse what we have. Images must arrive
   * whole, so an oversized download is a failure.
   */
  onOversize: 'truncate' | 'fail'
): Promise<{ url: string; body: Buffer; contentType: string } | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (isBlockedFetchUrl(current)) {
      return logSkip(`${label} URL is blocked`, { url: current, hop });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      logStep(`fetching ${label}`, { url: current, hop });
      const response = await fetchImpl(current, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'IRL-LocationImageBot/1.0',
          ...(init.headers ?? {}),
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return logSkip(`${label} redirect had no location header`, {
            url: current,
            status: response.status,
          });
        }
        try {
          current = new URL(location, current).href;
        } catch {
          return logSkip(`${label} redirect target is not a valid URL`, {
            url: current,
            location,
          });
        }
        continue;
      }

      if (!response.ok || !response.body) {
        return logSkip(`${label} request failed`, {
          url: current,
          status: response.status,
          hasBody: Boolean(response.body),
        });
      }

      const contentType = response.headers.get('content-type') ?? '';
      const chunks: Buffer[] = [];
      let total = 0;
      let truncated = false;
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          if (onOversize === 'fail') {
            await reader.cancel();
            return logSkip(`${label} exceeded the size cap`, {
              url: current,
              maxBytes,
            });
          }
          chunks.push(Buffer.from(value));
          truncated = true;
          await reader.cancel();
          break;
        }
        chunks.push(Buffer.from(value));
      }

      logStep(`fetched ${label}`, {
        url: current,
        contentType,
        bytes: total,
        truncated,
      });

      return {
        url: current,
        body: Buffer.concat(chunks),
        contentType,
      };
    } catch (error) {
      return logSkip(`${label} request threw`, {
        url: current,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timer);
    }
  }
  return logSkip(`${label} exceeded the redirect limit`, {
    url,
    maxRedirects: MAX_REDIRECTS,
  });
}

async function retrieveMapboxWebsite(
  placeId: string,
  fetchImpl: FetchLike,
  mapboxToken: string
): Promise<string | null> {
  const sessionToken = crypto.randomUUID();
  const retrieveUrl =
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
      placeId
    )}?session_token=${sessionToken}&access_token=${mapboxToken}` +
    `&attribute_sets=visit,venue`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTML_TIMEOUT_MS);
  try {
    logStep('retrieving Mapbox place metadata', { placeId });
    const response = await fetchImpl(retrieveUrl, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return logSkip('Mapbox retrieve failed', {
        placeId,
        status: response.status,
      });
    }
    const payload: unknown = await response.json();
    const website = extractWebsiteFromMapboxRetrieve(payload);
    logStep('Mapbox retrieve returned', { placeId, website });
    return website;
  } catch (error) {
    return logSkip('Mapbox retrieve threw', {
      placeId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeFavicon(imageUrl: string): boolean {
  try {
    const path = new URL(imageUrl).pathname.toLowerCase();
    return path.endsWith('favicon.ico') || path.endsWith('favicon.png');
  } catch {
    return true;
  }
}

/**
 * When a location is created without an image, try the official website
 * (Mapbox retrieve → og:image) and rehost it. Returns null on any failure.
 */
export async function resolveLocationWebsiteImage(
  placeId: string,
  options?: {
    fetchImpl?: FetchLike;
    mapboxToken?: string;
    upload?: typeof uploadProcessedLocationImages;
  }
): Promise<LocationWebsiteImageUrls | null> {
  const trimmedPlaceId = placeId.trim();
  logStep('autofill started', { placeId: trimmedPlaceId });

  if (
    !trimmedPlaceId ||
    trimmedPlaceId.startsWith('temp-') ||
    trimmedPlaceId.startsWith('search-')
  ) {
    return logSkip('place_id is not a Mapbox POI', { placeId: trimmedPlaceId });
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const mapboxToken =
    options?.mapboxToken ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
  if (!mapboxToken.trim()) {
    return logSkip('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set server-side');
  }

  const upload = options?.upload ?? uploadProcessedLocationImages;

  const overall = AbortSignal.timeout
    ? AbortSignal.timeout(OVERALL_TIMEOUT_MS)
    : undefined;

  const run = async (): Promise<LocationWebsiteImageUrls | null> => {
    const website = await retrieveMapboxWebsite(
      trimmedPlaceId,
      fetchImpl,
      mapboxToken.trim()
    );
    if (!website) {
      return logSkip('Mapbox has no website for this place', {
        placeId: trimmedPlaceId,
      });
    }

    const homepageUrl = normalizeHttpsWebsiteUrl(website);
    if (!homepageUrl) {
      return logSkip('website is not a usable https URL', { website });
    }

    const htmlResult = await fetchRedirectSafe(
      fetchImpl,
      homepageUrl,
      { method: 'GET' },
      HTML_TIMEOUT_MS,
      MAX_HTML_BYTES,
      'homepage',
      'truncate'
    );
    if (!htmlResult) return null;
    if (!htmlResult.contentType.toLowerCase().includes('text/html')) {
      return logSkip('homepage did not return HTML', {
        url: htmlResult.url,
        contentType: htmlResult.contentType,
      });
    }

    const candidate = extractPageImage(
      htmlResult.body.toString('utf8'),
      htmlResult.url
    );
    if (!candidate) {
      return logSkip('homepage exposes no usable image', {
        url: htmlResult.url,
      });
    }
    const imageHref = candidate.url;
    if (looksLikeFavicon(imageHref)) {
      return logSkip('page image is a favicon', { imageHref });
    }
    if (isBlockedFetchUrl(imageHref)) {
      return logSkip('page image URL is blocked', { imageHref });
    }

    logStep('found page image', { imageHref, source: candidate.source });

    const imageResult = await fetchRedirectSafe(
      fetchImpl,
      imageHref,
      { method: 'GET' },
      IMAGE_TIMEOUT_MS,
      MAX_IMAGE_BYTES,
      'image',
      'fail'
    );
    if (!imageResult) return null;
    if (!imageResult.contentType.toLowerCase().startsWith('image/')) {
      return logSkip('downloaded file is not an image', {
        url: imageResult.url,
        contentType: imageResult.contentType,
      });
    }
    if (isBlockedFetchUrl(imageResult.url)) {
      return logSkip('image resolved to a blocked URL', {
        url: imageResult.url,
      });
    }

    const uploaded = await upload(imageResult.body, {
      folder: 'location-images',
    });
    logStep('autofill succeeded', {
      placeId: trimmedPlaceId,
      source: imageResult.url,
      imageUrl: uploaded.imageUrl,
    });
    return {
      imageUrl: uploaded.imageUrl,
      thumbnailUrl: uploaded.thumbnailUrl,
    };
  };

  try {
    if (!overall) return await run();
    let settled = false;
    return await Promise.race([
      run().finally(() => {
        settled = true;
      }),
      new Promise<null>((resolve) => {
        overall.addEventListener(
          'abort',
          () => {
            // The timer keeps running after the race settles; only report a
            // timeout that actually beat the scrape.
            if (!settled) {
              logSkip('autofill hit the overall timeout', {
                placeId: trimmedPlaceId,
                timeoutMs: OVERALL_TIMEOUT_MS,
              });
            }
            resolve(null);
          },
          { once: true }
        );
      }),
    ]);
  } catch (error) {
    console.error(`${LOG_PREFIX} autofill threw`, {
      placeId: trimmedPlaceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
