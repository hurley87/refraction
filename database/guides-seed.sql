-- Seed: Michail Stangl Berlin city guide only. Run after `guides-schema.sql`.
-- `location_list_id` resolves when a row exists in `location_lists` with slug `michail-stangl-berlin` and `is_active = true`; otherwise it is NULL.
-- Dollar-quoted strings avoid apostrophe escaping issues in clients that mangle `''`.

INSERT INTO guides (
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
  featured_people
)
VALUES (
  'berlin-michail-stangl',
  'city_guide',
  'The IRL Guide to',
  'Berlin',
  NULL,
  NULL,
  '/city-guides/berlin/michail/michail-stangl-hero.jpg',
  'Berlin - hero photograph for the city guide',
  $lead$For over 15 years, Michail Stangl aka Opium Hum has been a vital node in the global electronic music underground.$lead$,
  ARRAY[
    $p$Best known as the former face and lead programmer of Boiler Room and as curator of Berlin's legendary CTM Festival, Stangl's work has consistently mapped the bleeding edges of contemporary club culture.$p$
  ]::text[],
  (SELECT id FROM location_lists WHERE slug = 'michail-stangl-berlin' AND is_active = true LIMIT 1),
  '/city-guides/berlin/michail/michail-map.png',
  'Map of locations featured in this guide',
  NULL,
  true,
  NOW(),
  true,
  $card$Boiler Room, CTM, and the clubs that still feel like the edge of the map - Berlin through Michail Stangl's lens.$card$,
  '/city-guides/berlin/michail/michail-stangl-hero.jpg',
  'Berlin - Michail Stangl city guide',
  ARRAY['Michail Stangl', 'Graham Bertie']::text[]
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO guide_contributors (
  guide_id,
  position,
  name,
  bio,
  photo_url,
  photo_alt,
  instagram_href
)
SELECT g.id,
  0,
  'Michail Stangl',
  $bio0$For more than a decade, Michail Stangl has been a driving force in the global underground music scene, blending avant-garde, pop, and underground culture into a mesmerizing mix.$bio0$,
  '/city-guides/berlin/michail/michail-stangl-hero.jpg',
  'Michail Stangl',
  'https://www.instagram.com/opium_hum/'
FROM guides g
WHERE g.slug = 'berlin-michail-stangl'
ON CONFLICT (guide_id, position) DO NOTHING;

INSERT INTO guide_contributors (
  guide_id,
  position,
  name,
  bio,
  photo_url,
  photo_alt,
  instagram_href
)
SELECT g.id,
  1,
  'Graham Bertie',
  $bio1$Graham Bertie is a DJ and producer based in Toronto. He is known for his unique blend of techno and house music.$bio1$,
  '/city-guides/berlin/graham/graham-bertie-hero.jpg',
  'Graham Bertie',
  'https://www.instagram.com/grahamdouglasbertie/'
FROM guides g
WHERE g.slug = 'berlin-michail-stangl'
ON CONFLICT (guide_id, position) DO NOTHING;
