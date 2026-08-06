-- Normalize usernames that contain whitespace to underscore form.
-- e.g. "Mr Frog" / "mr frog" → "mr_frog"
-- Run in the Supabase SQL editor after reviewing the optional previews.
--
-- Preview spaced usernames (optional):
--   SELECT id, username,
--          lower(regexp_replace(btrim(username), '\s+', '_', 'g')) AS next_username
--   FROM public.players
--   WHERE username IS NOT NULL AND username ~ '\s';

-- 1) Convert whitespace to underscores. If the target is already taken by another
--    row (or by another spaced rename in this batch), append a stable suffix
--    (max 30 chars, matches app usernameSchema).
WITH candidates AS (
  SELECT
    id,
    wallet_address,
    username,
    lower(regexp_replace(btrim(username), '\s+', '_', 'g')) AS candidate
  FROM public.players
  WHERE username IS NOT NULL
    AND username ~ '\s'
),
ranked AS (
  SELECT
    c.*,
    row_number() OVER (
      PARTITION BY c.candidate
      ORDER BY c.id ASC
    ) AS cand_rn,
    EXISTS (
      SELECT 1
      FROM public.players p
      WHERE p.id <> c.id
        AND p.username IS NOT NULL
        AND p.username !~ '\s'
        AND lower(btrim(p.username)) = c.candidate
    ) AS taken_by_clean
  FROM candidates c
)
UPDATE public.players p
SET username = CASE
  WHEN r.taken_by_clean OR r.cand_rn > 1 THEN
    left(r.candidate, 20)
    || '_'
    || substring(
      md5(coalesce(r.wallet_address, '') || r.id::text)
      FROM 1 FOR 9
    )
  ELSE r.candidate
END
FROM ranked r
WHERE p.id = r.id;

-- 2) Safety pass: lowercase + trim any remaining usernames (no spaces expected).
UPDATE public.players
SET username = nullif(lower(btrim(coalesce(username, ''))), '')
WHERE username IS NOT NULL;
