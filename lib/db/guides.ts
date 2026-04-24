import { supabase } from '@/lib/db/client';
import { getLocationsForList } from '@/lib/db/location-lists';
import type { LocationListLocation } from '@/lib/types';
import {
  parseEditorialBlocks,
  type EditorialContentBlock,
} from '@/lib/guides/block-schema';
import type { GuideKind } from '@/components/city-guides/featured-editorial-hero-card';

const GUIDES_QUERY_MS = 12_000;
const GUIDE_QUERY_TIMEOUT = Symbol('guideQueryTimeout');

async function withQueryTimeout<T>(
  promise: Promise<T>
): Promise<T | typeof GUIDE_QUERY_TIMEOUT> {
  return Promise.race([
    promise,
    new Promise<typeof GUIDE_QUERY_TIMEOUT>((resolve) => {
      setTimeout(() => resolve(GUIDE_QUERY_TIMEOUT), GUIDES_QUERY_MS);
    }),
  ]);
}

function logTimeout(context: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[guides] ${context} timed out after ${GUIDES_QUERY_MS}ms; check Supabase configuration.`
    );
  }
}

export type GuideKindDb = 'city_guide' | 'editorial';

export type GuideContributorRow = {
  guide_id: string;
  position: number;
  name: string;
  bio: string | null;
  photo_url: string | null;
  photo_alt: string | null;
  instagram_href: string | null;
};

/** Raw row from `guides` (snake_case as returned by Supabase). */
export type GuideRow = {
  id: string;
  slug: string;
  kind: GuideKindDb;
  title_prefix: string | null;
  city_name: string | null;
  title_primary: string | null;
  title_secondary: string | null;
  hero_image_url: string;
  hero_image_alt: string;
  lead_headline: string | null;
  lead_paragraphs: string[] | null;
  location_list_id: string | null;
  map_image_url: string | null;
  map_image_alt: string | null;
  blocks: unknown | null;
  is_published: boolean;
  published_at: string | null;
  is_featured: boolean;
  card_preview: string | null;
  card_image_url: string | null;
  card_image_alt: string | null;
  featured_people: string[] | null;
  created_at: string;
  updated_at: string;
};

export type GuideContributorUi = {
  name: string;
  bio: string;
  photoSrc: string;
  photoAlt: string;
  instagramHref: string;
};

export function toGuideContributorUi(
  row: GuideContributorRow
): GuideContributorUi {
  return {
    name: row.name,
    bio: row.bio?.trim() ?? '',
    photoSrc: row.photo_url?.trim() || '/city-guides/user-icon.svg',
    photoAlt: row.photo_alt?.trim() || row.name,
    instagramHref: row.instagram_href?.trim() ?? '',
  };
}

export function guideKindToUi(kind: GuideKindDb): GuideKind {
  return kind === 'city_guide' ? 'city-guide' : 'editorial';
}

export function hubListTitle(row: GuideRow): string {
  if (row.kind === 'city_guide') {
    const p = row.title_prefix?.trim() ?? '';
    const c = row.city_name?.trim() ?? '';
    return [p, c].filter(Boolean).join(' ').trim() || row.slug;
  }
  const primary = row.title_primary?.trim() ?? '';
  const secondary = row.title_secondary?.trim();
  if (primary && secondary) return `${primary} : ${secondary}`;
  return primary || row.slug;
}

export type GuideHubListItem = {
  id: string;
  slug: string;
  kind: GuideKindDb;
  guideKind: GuideKind;
  title: string;
  preview: string;
  publishedAt: string;
  imageSrc: string;
  imageAlt: string;
  readHref: string;
};

export type GuideFeaturedPayload = {
  id: string;
  slug: string;
  kind: GuideKindDb;
  guideKind: GuideKind;
  titleLine1: string;
  titleLine2: string;
  featuredPeople: string[];
  heroImageSrc: string;
  heroImageAlt: string;
  readHref: string;
};

function readHrefFor(row: GuideRow): string {
  return row.kind === 'editorial'
    ? `/city-guides/editorial/${row.slug}`
    : `/city-guides/${row.slug}`;
}

function featuredTitleLines(row: GuideRow): { line1: string; line2: string } {
  if (row.kind === 'city_guide') {
    return {
      line1: row.title_prefix?.trim() ?? '',
      line2: row.city_name?.trim() ?? '',
    };
  }
  return {
    line1: row.title_primary?.trim() ?? '',
    line2: row.title_secondary?.trim() ?? '',
  };
}

function toHubListItem(row: GuideRow): GuideHubListItem {
  const published =
    row.published_at ??
    row.updated_at ??
    row.created_at ??
    new Date().toISOString();
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    guideKind: guideKindToUi(row.kind),
    title: hubListTitle(row),
    preview: row.card_preview?.trim() || row.lead_headline?.trim() || '',
    publishedAt: published,
    imageSrc: row.card_image_url?.trim() || row.hero_image_url || '',
    imageAlt: row.card_image_alt?.trim() || row.hero_image_alt || '',
    readHref: readHrefFor(row),
  };
}

function toFeaturedPayload(row: GuideRow): GuideFeaturedPayload {
  const { line1, line2 } = featuredTitleLines(row);
  const people = row.featured_people?.filter((p) => p.trim()) ?? [];
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    guideKind: guideKindToUi(row.kind),
    titleLine1: line1,
    titleLine2: line2,
    featuredPeople: people,
    heroImageSrc: row.hero_image_url || '',
    heroImageAlt: row.hero_image_alt || '',
    readHref: readHrefFor(row),
  };
}

const GUIDE_LIST_COLUMNS = `
  id,
  slug,
  kind,
  title_prefix,
  city_name,
  title_primary,
  title_secondary,
  hero_image_url,
  hero_image_alt,
  lead_headline,
  lead_paragraphs,
  location_list_id,
  map_image_url,
  map_image_alt,
  blocks,
  is_published,
  published_at,
  is_featured,
  card_preview,
  card_image_url,
  card_image_alt,
  featured_people,
  created_at,
  updated_at
`.replace(/\s+/g, ' ');

async function fetchPublishedGuideRows(
  kinds?: GuideKindDb[]
): Promise<GuideRow[] | null> {
  let q = supabase
    .from('guides')
    .select(GUIDE_LIST_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false });

  if (kinds?.length) {
    q = q.in('kind', kinds);
  }

  const { data, error } = await q;
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[guides] fetchPublishedGuideRows:', error.message);
    }
    return null;
  }
  return (data ?? []) as unknown as GuideRow[];
}

/**
 * All published guides for the hub list (newest first).
 */
export async function getPublishedGuides(options?: {
  kinds?: GuideKindDb[];
  excludeId?: string;
}): Promise<GuideHubListItem[]> {
  const rowsOrTimeout = await withQueryTimeout(
    fetchPublishedGuideRows(options?.kinds)
  );
  if (rowsOrTimeout === GUIDE_QUERY_TIMEOUT) {
    logTimeout('getPublishedGuides');
    return [];
  }
  let rows = rowsOrTimeout ?? [];
  if (options?.excludeId) {
    rows = rows.filter((r) => r.id !== options.excludeId);
  }
  return rows.map(toHubListItem);
}

/**
 * Featured hero: `is_featured` published guide, else newest published.
 */
export async function getFeaturedGuide(): Promise<GuideFeaturedPayload | null> {
  const rowsOrTimeout = await withQueryTimeout(fetchPublishedGuideRows());
  if (rowsOrTimeout === GUIDE_QUERY_TIMEOUT) {
    logTimeout('getFeaturedGuide');
    return null;
  }
  const rows = rowsOrTimeout ?? [];
  if (rows.length === 0) return null;
  const featured = rows.find((r) => r.is_featured);
  return toFeaturedPayload(featured ?? rows[0]);
}

async function fetchContributorsForGuide(
  guideId: string
): Promise<GuideContributorRow[]> {
  const { data, error } = await supabase
    .from('guide_contributors')
    .select(
      'guide_id, position, name, bio, photo_url, photo_alt, instagram_href'
    )
    .eq('guide_id', guideId)
    .order('position', { ascending: true });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[guides] fetchContributorsForGuide:', error.message);
    }
    return [];
  }
  return (data ?? []) as GuideContributorRow[];
}

async function fetchGuideBySlug(
  slug: string,
  mustBePublished: boolean
): Promise<GuideRow | null> {
  let q = supabase.from('guides').select(GUIDE_LIST_COLUMNS).eq('slug', slug);
  if (mustBePublished) {
    q = q.eq('is_published', true);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[guides] fetchGuideBySlug:', error.message);
    }
    return null;
  }
  return (data as unknown as GuideRow | null) ?? null;
}

export type CityGuidePageData = {
  row: GuideRow;
  contributors: GuideContributorUi[];
  contributorNames: string[];
  locations: LocationListLocation[];
  locationContributorByPlaceId: Map<string, string>;
};

/**
 * Public city guide article by slug.
 */
export async function getCityGuidePageData(
  slug: string
): Promise<CityGuidePageData | null> {
  const rowOrTimeout = await withQueryTimeout(fetchGuideBySlug(slug, true));
  if (rowOrTimeout === GUIDE_QUERY_TIMEOUT) {
    logTimeout('getCityGuidePageData');
    return null;
  }
  const row = rowOrTimeout;
  if (!row || row.kind !== 'city_guide') return null;

  const contributorsOrTimeout = await withQueryTimeout(
    fetchContributorsForGuide(row.id)
  );
  if (contributorsOrTimeout === GUIDE_QUERY_TIMEOUT) {
    logTimeout('getCityGuidePageData.contributors');
    return null;
  }
  const contribRows = contributorsOrTimeout ?? [];
  const contributors = contribRows.map(toGuideContributorUi);
  const contributorNames = contributors.map((c) => c.name);

  let locations: LocationListLocation[] = [];
  if (row.location_list_id) {
    try {
      const locOrTimeout = await withQueryTimeout(
        getLocationsForList(row.location_list_id, { membershipOrder: 'asc' })
      );
      if (locOrTimeout === GUIDE_QUERY_TIMEOUT) {
        logTimeout('getCityGuidePageData.locations');
      } else {
        locations = locOrTimeout ?? [];
      }
    } catch {
      locations = [];
    }
  }

  const overridesOrTimeout = await withQueryTimeout(
    (async () => {
      const { data, error } = await supabase
        .from('guide_location_overrides')
        .select('location_id, contributor_name')
        .eq('guide_id', row.id);
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[guides] location overrides:', error.message);
        }
        return [];
      }
      return data ?? [];
    })()
  );

  const locationContributorByPlaceId = new Map<string, string>();
  if (Array.isArray(overridesOrTimeout) && overridesOrTimeout.length > 0) {
    const byLocId = new Map<number, string>();
    for (const o of overridesOrTimeout as {
      location_id: number;
      contributor_name: string | null;
    }[]) {
      if (o.contributor_name?.trim()) {
        byLocId.set(o.location_id, o.contributor_name.trim());
      }
    }
    for (const entry of locations) {
      const name = byLocId.get(entry.location_id);
      if (name) {
        locationContributorByPlaceId.set(entry.location.place_id, name);
      }
    }
  }

  return {
    row,
    contributors,
    contributorNames,
    locations,
    locationContributorByPlaceId,
  };
}

export type EditorialPageData = {
  row: GuideRow;
  contributors: GuideContributorUi[];
  contributorNames: string[];
  blocks: EditorialContentBlock[];
};

/**
 * Public editorial article by slug.
 */
export async function getEditorialPageData(
  slug: string
): Promise<EditorialPageData | null> {
  const rowOrTimeout = await withQueryTimeout(fetchGuideBySlug(slug, true));
  if (rowOrTimeout === GUIDE_QUERY_TIMEOUT) {
    logTimeout('getEditorialPageData');
    return null;
  }
  const row = rowOrTimeout;
  if (!row || row.kind !== 'editorial') return null;

  const contributorsOrTimeout = await withQueryTimeout(
    fetchContributorsForGuide(row.id)
  );
  if (contributorsOrTimeout === GUIDE_QUERY_TIMEOUT) {
    logTimeout('getEditorialPageData.contributors');
    return null;
  }
  const contribRows = contributorsOrTimeout ?? [];
  const contributors = contribRows.map(toGuideContributorUi);
  const contributorNames = contributors.map((c) => c.name);
  const blocks = parseEditorialBlocks(row.blocks);

  return { row, contributors, contributorNames, blocks };
}

// --- Admin (published or draft) ---

export type AdminGuideSummary = {
  id: string;
  slug: string;
  kind: GuideKindDb;
  is_published: boolean;
  published_at: string | null;
  is_featured: boolean;
  updated_at: string;
  label: string;
};

export async function adminListGuides(): Promise<AdminGuideSummary[]> {
  const { data, error } = await supabase
    .from('guides')
    .select(
      'id, slug, kind, is_published, published_at, is_featured, updated_at, title_prefix, city_name, title_primary, title_secondary'
    )
    .order('updated_at', { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as GuideRow[];
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    kind: r.kind,
    is_published: r.is_published,
    published_at: r.published_at,
    is_featured: r.is_featured,
    updated_at: r.updated_at,
    label: hubListTitle(r),
  }));
}

export type AdminGuideDetail = {
  guide: GuideRow;
  contributors: GuideContributorRow[];
};

export async function adminGetGuide(
  id: string
): Promise<AdminGuideDetail | null> {
  const { data: guide, error } = await supabase
    .from('guides')
    .select(GUIDE_LIST_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!guide) return null;

  const { data: contributors, error: cErr } = await supabase
    .from('guide_contributors')
    .select(
      'guide_id, position, name, bio, photo_url, photo_alt, instagram_href'
    )
    .eq('guide_id', id)
    .order('position', { ascending: true });

  if (cErr) throw cErr;

  return {
    guide: guide as unknown as GuideRow,
    contributors: (contributors ?? []) as GuideContributorRow[],
  };
}

export type CreateGuideInput = {
  kind: GuideKindDb;
  slug: string;
};

export async function createGuide(input: CreateGuideInput): Promise<GuideRow> {
  const now = new Date().toISOString();
  const defaults =
    input.kind === 'city_guide'
      ? {
          title_prefix: 'The IRL Guide to',
          city_name: 'New City',
          title_primary: null,
          title_secondary: null,
        }
      : {
          title_prefix: null,
          city_name: null,
          title_primary: 'New editorial',
          title_secondary: null,
        };

  const { data, error } = await supabase
    .from('guides')
    .insert({
      slug: input.slug,
      kind: input.kind,
      ...defaults,
      hero_image_url: '',
      hero_image_alt: '',
      lead_paragraphs: [],
      is_published: false,
      published_at: null,
      is_featured: false,
      card_preview: '',
      card_image_url: '',
      card_image_alt: '',
      featured_people: [],
      blocks: input.kind === 'editorial' ? [] : null,
      updated_at: now,
    })
    .select(GUIDE_LIST_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as GuideRow;
}

export type UpdateGuidePayload = Partial<{
  slug: string;
  kind: GuideKindDb;
  title_prefix: string | null;
  city_name: string | null;
  title_primary: string | null;
  title_secondary: string | null;
  hero_image_url: string;
  hero_image_alt: string;
  lead_headline: string | null;
  lead_paragraphs: string[];
  location_list_id: string | null;
  map_image_url: string | null;
  map_image_alt: string | null;
  blocks: unknown | null;
  is_published: boolean;
  published_at: string | null;
  is_featured: boolean;
  card_preview: string | null;
  card_image_url: string | null;
  card_image_alt: string | null;
  featured_people: string[];
}>;

export async function updateGuide(
  id: string,
  patch: UpdateGuidePayload
): Promise<GuideRow> {
  if (patch.is_featured === true) {
    await supabase.from('guides').update({ is_featured: false }).neq('id', id);
  }

  const { data, error } = await supabase
    .from('guides')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(GUIDE_LIST_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as GuideRow;
}

export async function deleteGuide(id: string): Promise<void> {
  const { error } = await supabase.from('guides').delete().eq('id', id);
  if (error) throw error;
}

export type ContributorInput = {
  position: number;
  name: string;
  bio: string | null;
  photo_url: string | null;
  photo_alt: string | null;
  instagram_href: string | null;
};

export async function replaceGuideContributors(
  guideId: string,
  rows: ContributorInput[]
): Promise<void> {
  const { data: previousRows, error: prevErr } = await supabase
    .from('guide_contributors')
    .select(
      'guide_id, position, name, bio, photo_url, photo_alt, instagram_href'
    )
    .eq('guide_id', guideId);
  if (prevErr) throw prevErr;

  const { error: delErr } = await supabase
    .from('guide_contributors')
    .delete()
    .eq('guide_id', guideId);
  if (delErr) throw delErr;

  if (rows.length === 0) return;

  const { error: insErr } = await supabase.from('guide_contributors').insert(
    rows.map((r) => ({
      guide_id: guideId,
      position: r.position,
      name: r.name,
      bio: r.bio,
      photo_url: r.photo_url,
      photo_alt: r.photo_alt,
      instagram_href: r.instagram_href,
    }))
  );
  if (insErr) {
    const snapshot = (previousRows ?? []) as {
      guide_id: string;
      position: number;
      name: string;
      bio: string | null;
      photo_url: string | null;
      photo_alt: string | null;
      instagram_href: string | null;
    }[];
    if (snapshot.length > 0) {
      const { error: restoreErr } = await supabase
        .from('guide_contributors')
        .insert(snapshot);
      if (restoreErr) {
        console.error(
          '[guides] replaceGuideContributors: insert failed and restore failed',
          restoreErr
        );
      }
    }
    throw insErr;
  }
}

export async function ensureUniqueGuideSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const normalized =
    baseSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || `guide-${Date.now()}`;

  let attempt = 0;
  while (attempt < 50) {
    const candidate = attempt === 0 ? normalized : `${normalized}-${attempt}`;
    let q = supabase.from('guides').select('id').eq('slug', candidate);
    if (excludeId) {
      q = q.neq('id', excludeId);
    }
    const { data, error } = await q.maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return candidate;
    attempt += 1;
  }
  throw new Error('Unable to generate unique slug');
}
