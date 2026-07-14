/**
 * Deduce `locations.type` as a `categories.slug` from each row's name + description
 * (and legacy freeform type labels when present).
 *
 * Usage:
 *   node scripts/classify-location-types.mjs           # dry-run
 *   node scripts/classify-location-types.mjs --apply    # write updates
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!url.trim() || !key.trim()) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const supabase = createClient(url, key);

/** Legacy/list labels → category slug */
const TYPE_ALIASES = new Map(
  Object.entries({
    bar: 'bar',
    bars: 'bar',
    'bars & nightlife': 'bar',
    'nightlife & hi-fi': 'bar',
    'audiophile & hi-fi': 'bar',
    cafe: 'cafes',
    cafes: 'cafes',
    coffee: 'cafes',
    'coffee & cafés': 'cafes',
    'coffee & cafes': 'cafes',
    'coffee & breakfast': 'cafes',
    club: 'club',
    'conscious clubbing': 'club',
    conference: 'conference',
    festival: 'festival',
    event: 'festival',
    gallery: 'gallery',
    galleries: 'gallery',
    'arts & culture': 'gallery',
    'arts & design': 'gallery',
    'art, architecture & culture': 'gallery',
    hotel: 'hotel',
    'in-between': 'in-between',
    'community spots': 'in-between',
    membership: 'membership',
    mobility: 'mobility',
    'performance-venue': 'performance-venue',
    'performance venue': 'performance-venue',
    restaurant: 'restaurant',
    restaurants: 'restaurant',
    'casual food joints': 'restaurant',
    'casual food joint': 'restaurant',
    shop: 'shop',
    shopping: 'shop',
    'bookshops & shopping': 'shop',
    software: 'software',
    wellness: 'wellness',
    reset: 'wellness',
  }).map(([k, v]) => [k.toLowerCase(), v])
);

/**
 * Keyword rules (specific → general). Weight: name hits count more than description.
 * Patterns are case-insensitive word-ish matches against normalized text.
 */
const KEYWORD_RULES = [
  {
    slug: 'hotel',
    patterns: [
      /\bhotels?\b/,
      /\bhostels?\b/,
      /\bresorts?\b/,
      /\blodging\b/,
      /\bainsworth\b/,
    ],
  },
  {
    slug: 'conference',
    patterns: [
      /\bconferences?\b/,
      /\bsummits?\b/,
      /\bconventions?\b/,
      /\bsymposiums?\b/,
      /\bexpo\b/,
    ],
  },
  {
    slug: 'festival',
    patterns: [/\bfestivals?\b/, /\bfest\b/, /\bcarnival\b/],
  },
  {
    slug: 'club',
    patterns: [
      /\bnightclubs?\b/,
      /\bclubs?\b/,
      /\brace\b/,
      /\bwarehouse party\b/,
      /\bdance floor\b/,
      /\bunderground electronic\b/,
      /\btechno\b/,
      /\bhouse music\b/,
    ],
  },
  {
    slug: 'gallery',
    patterns: [
      /\bgaller(?:y|ies)\b/,
      /\bmuseums?\b/,
      /\bart centr?e\b/,
      /\bart space\b/,
      /\bexhibition\b/,
      /\bcontemporary art\b/,
    ],
  },
  {
    slug: 'performance-venue',
    patterns: [
      /\btheat(?:er|re)s?\b/,
      /\bamphitheat(?:er|re)s?\b/,
      /\bconcert halls?\b/,
      /\bauditoriums?\b/,
      /\bperformance (?:venue|space|hall)\b/,
      /\blive music venue\b/,
      /\bopera house\b/,
      /\bknockdown center\b/,
    ],
  },
  {
    slug: 'wellness',
    patterns: [
      /\bwellness\b/,
      /\byoga\b/,
      /\bspas?\b/,
      /\bsaunas?\b/,
      /\bbathhouses?\b/,
      /\bfloat\b/,
      /\bmeditation\b/,
      /\bgyms?\b/,
      /\bfitness\b/,
      /\bpilates\b/,
      /\bhot tub\b/,
      /\bpools?\b/,
      /\bswimming\b/,
    ],
  },
  {
    slug: 'shop',
    patterns: [
      /\bbookstores?\b/,
      /\bbookshops?\b/,
      /\blibrairie\b/,
      /\brecord stores?\b/,
      /\brecords\b/,
      /\bboutiques?\b/,
      /\bshops?\b/,
      /\bstores?\b/,
      /\bretail\b/,
      /\bflea markets?\b/,
      /\bmarkets?\b/,
      /\bzines?\b/,
      /\bvintage\b/,
    ],
  },
  {
    slug: 'mobility',
    patterns: [
      /\bmobility\b/,
      /\bbixi\b/,
      /\bbike share\b/,
      /\btransit\b/,
      /\bferry\b/,
      /\bscooters?\b/,
    ],
  },
  {
    slug: 'membership',
    patterns: [
      /\bmemberships?\b/,
      /\bmembers(?:-|\s)?only\b/,
      /\bmembers clubs?\b/,
      /\bprivate clubs?\b/,
    ],
  },
  {
    slug: 'software',
    patterns: [/\bsoftwares?\b/, /\bsaas\b/, /\bapps?\b/, /\bplatforms?\b/],
  },
  {
    slug: 'cafes',
    patterns: [
      /\bcaf[eé]s?\b/,
      /\bcoffees?\b/,
      /\bespresso\b/,
      /\broaster(?:y|ies)\b/,
      /\bbaker(?:y|ies)\b/,
      /\bpatisser(?:y|ies)\b/,
      /\blatte\b/,
      /\bthird[- ]wave\b/,
    ],
  },
  {
    slug: 'restaurant',
    patterns: [
      /\brestaurants?\b/,
      /\beater(?:y|ies)\b/,
      /\bbistros?\b/,
      /\bdiners?\b/,
      /\bdelis?\b/,
      /\bkitchen\b/,
      /\bcuisine\b/,
      /\bbrunch\b/,
      /\bpasta\b/,
      /\bramen\b/,
      /\bsushi\b/,
      /\bpizza\b/,
      /\bvegan\b/,
      /\bfood\b/,
      /\bdining\b/,
      /\bsmoked meat\b/,
      /\btapas\b/,
    ],
  },
  {
    slug: 'bar',
    patterns: [
      /\bbars?\b/,
      /\bpubs?\b/,
      /\bcocktail\b/,
      /\bwine bars?\b/,
      /\blistening bars?\b/,
      /\bhi[- ]?fi\b/,
      /\baudiophile\b/,
      /\btaprooms?\b/,
      /\bbrewer(?:y|ies)\b/,
      /\bspeakeas(?:y|ies)\b/,
      /\bnightlife\b/,
      /\bdj sets?\b/,
      /\bnatural wines?\b/,
      /\bsake\b/,
    ],
  },
  {
    slug: 'in-between',
    patterns: [
      /\bparks?\b/,
      /\bplazas?\b/,
      /\bgardens?\b/,
      /\bcanals?\b/,
      /\bpublic spaces?\b/,
      /\bthird spaces?\b/,
      /\bcommunity\b/,
      /\bsquare\b/,
      /\bpit\b/,
      /\bgreenway\b/,
    ],
  },
];

function normalizeText(value) {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scoreKeywords(nameText, descText) {
  const scores = new Map();
  for (const rule of KEYWORD_RULES) {
    let score = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(nameText)) score += 3;
      if (pattern.test(descText)) score += 1;
    }
    if (score > 0) scores.set(rule.slug, score);
  }
  return scores;
}

function classifyLocation(row, activeSlugs) {
  const nameText = normalizeText(row.name);
  const descText = normalizeText(row.description);
  const current = (row.type ?? '').trim();
  const currentKey = current.toLowerCase();

  const alias = TYPE_ALIASES.get(currentKey);
  if (alias && activeSlugs.has(alias)) {
    // Still allow keywords to refine obvious freeform→slug when text disagrees strongly
    const scores = scoreKeywords(nameText, descText);
    const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 4 && best[0] !== alias && best[1] > (scores.get(alias) ?? 0) + 2) {
      return { slug: best[0], reason: `keyword/${best[0]} (over alias ${alias})`, confidence: best[1] };
    }
    return { slug: alias, reason: `alias/${current}`, confidence: 10 };
  }

  if (activeSlugs.has(currentKey)) {
    return { slug: currentKey, reason: 'already-valid', confidence: 100 };
  }

  const scores = scoreKeywords(nameText, descText);
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return { slug: 'in-between', reason: 'fallback/in-between', confidence: 0 };
  }

  const [slug, confidence] = ranked[0];
  // Prefer cafes over restaurant when both coffee + food signals
  if (
    slug === 'restaurant' &&
    (scores.get('cafes') ?? 0) >= 3 &&
    (scores.get('cafes') ?? 0) >= confidence - 1
  ) {
    return { slug: 'cafes', reason: 'keyword/cafes (coffee bias)', confidence: scores.get('cafes') };
  }
  // Prefer bar over club when "listening bar" / hi-fi dominate
  if (
    slug === 'club' &&
    (scores.get('bar') ?? 0) >= 3 &&
    (scores.get('bar') ?? 0) >= confidence - 1
  ) {
    return { slug: 'bar', reason: 'keyword/bar (over club)', confidence: scores.get('bar') };
  }

  return { slug, reason: `keyword/${slug}`, confidence };
}

async function fetchAllLocations() {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('locations')
      .select('id,name,description,type')
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function main() {
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('slug,name,is_active');
  if (catErr) throw catErr;

  const allSlugs = new Set(categories.map((c) => c.slug));
  // Prefer active categories for assignment; inactive (e.g. coffee) remapped via aliases.
  const activeSlugs = new Set(
    categories.filter((c) => c.is_active).map((c) => c.slug)
  );
  // Ensure inactive slugs that aliases might target can still work if needed
  for (const slug of allSlugs) {
    if (!activeSlugs.has(slug) && slug === 'coffee' && activeSlugs.has('cafes')) {
      // coffee → cafes handled in aliases
    }
  }

  const locations = await fetchAllLocations();
  console.log(`Locations: ${locations.length}`);
  console.log(`Active categories: ${[...activeSlugs].join(', ')}`);
  console.log(APPLY ? 'MODE: APPLY' : 'MODE: dry-run (pass --apply to write)');

  const changes = [];
  const unchanged = [];
  const bySlug = {};

  for (const row of locations) {
    const result = classifyLocation(row, activeSlugs);
    if (!activeSlugs.has(result.slug)) {
      throw new Error(`Classifier produced inactive/unknown slug: ${result.slug}`);
    }
    bySlug[result.slug] = (bySlug[result.slug] || 0) + 1;
    if (row.type === result.slug) {
      unchanged.push(row.id);
      continue;
    }
    changes.push({
      id: row.id,
      name: row.name,
      from: row.type,
      to: result.slug,
      reason: result.reason,
      confidence: result.confidence,
    });
  }

  console.log('\nProposed distribution:');
  console.table(
    Object.entries(bySlug)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count]) => ({ slug, count }))
  );
  console.log(`Would update: ${changes.length}`);
  console.log(`Unchanged: ${unchanged.length}`);
  console.log('\nSample changes (first 40):');
  for (const c of changes.slice(0, 40)) {
    console.log(
      `#${c.id} "${c.name}"  ${JSON.stringify(c.from)} → ${c.to}  (${c.reason}, conf=${c.confidence})`
    );
  }

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to write.');
    return;
  }

  let updated = 0;
  let failed = 0;
  const BATCH = 50;
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = changes.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (c) => {
        const { error } = await supabase
          .from('locations')
          .update({ type: c.to })
          .eq('id', c.id);
        if (error) {
          failed += 1;
          console.error(`Failed #${c.id}:`, error.message);
        } else {
          updated += 1;
        }
      })
    );
    process.stdout.write(`\rUpdated ${updated}/${changes.length} (failed ${failed})`);
  }
  console.log(`\nDone. Updated ${updated}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
