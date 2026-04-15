-- Ensure one redemption per wallet/perk pair and release any duplicate-claimed codes.
WITH ranked_redemptions AS (
  SELECT
    id,
    discount_code_id,
    user_wallet_address,
    perk_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_wallet_address, perk_id
      ORDER BY redeemed_at ASC NULLS LAST, id ASC
    ) AS redemption_rank
  FROM user_perk_redemptions
),
duplicate_redemptions AS (
  SELECT id, discount_code_id
  FROM ranked_redemptions
  WHERE redemption_rank > 1
),
released_codes AS (
  UPDATE perk_discount_codes
  SET
    is_claimed = false,
    claimed_by_wallet_address = NULL,
    claimed_at = NULL
  WHERE id IN (SELECT discount_code_id FROM duplicate_redemptions)
  RETURNING id
)
DELETE FROM user_perk_redemptions
WHERE id IN (SELECT id FROM duplicate_redemptions);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_perk_redemptions_wallet_perk_unique
ON user_perk_redemptions(user_wallet_address, perk_id);
