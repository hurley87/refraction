-- Unique usernames on `players` (lowercase storage + partial unique index).
-- Run the whole script in order in the Supabase SQL editor.
--
-- Preview duplicates (optional):
--   SELECT lower(btrim(username)) AS u, count(*) AS n, array_agg(id ORDER BY id) AS ids
--   FROM players
--   WHERE nullif(btrim(coalesce(username, '')), '') IS NOT NULL
--   GROUP BY 1 HAVING count(*) > 1;
--
-- Preview renames before applying (optional): run the SELECT inside the block below
-- with your real CTE by temporarily commenting out the UPDATE.

-- 1) Resolve duplicates: smallest `id` per normalized username keeps the name;
--    others become `left(base,20) || '_' || 9 hex` (max 30 chars, matches app limit).
--    Suffix = substring(md5(wallet_address || id), 1, 9) so it is stable and almost always unique.
--    To prefer oldest account as keeper, use: ORDER BY created_at ASC NULLS LAST, id ASC
WITH ranked AS (
  SELECT
    id,
    wallet_address,
    username,
    row_number() OVER (
      PARTITION BY lower(btrim(coalesce(username, '')))
      ORDER BY id ASC
    ) AS rn
  FROM public.players
  WHERE nullif(btrim(coalesce(username, '')), '') IS NOT NULL
)
UPDATE public.players p
SET username = left(lower(btrim(r.username)), 20)
  || '_'
  || substring(md5(coalesce(r.wallet_address, '') || r.id::text) from 1 for 9)
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 2) Normalize remaining usernames to lowercase (matches app PUT /api/profile).
UPDATE public.players
SET username = nullif(lower(btrim(coalesce(username, ''))), '')
WHERE username IS NOT NULL;

-- 3) Enforce uniqueness (multiple NULL usernames allowed).
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_username_unique
ON public.players (username)
WHERE username IS NOT NULL;
