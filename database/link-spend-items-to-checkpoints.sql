-- Migration: Link spend_items rows to checkpoints, one spend item per spend checkpoint.
-- Also enforce one redemption per user per item.

ALTER TABLE spend_items
ADD COLUMN IF NOT EXISTS checkpoint_id VARCHAR(12);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'spend_items_checkpoint_id_fkey'
  ) THEN
    ALTER TABLE spend_items
    ADD CONSTRAINT spend_items_checkpoint_id_fkey
    FOREIGN KEY (checkpoint_id)
    REFERENCES checkpoints(id)
    ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_items_checkpoint_id_unique
ON spend_items(checkpoint_id)
WHERE checkpoint_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_redemptions_item_wallet_unique
ON spend_redemptions(spend_item_id, user_wallet_address);

COMMENT ON COLUMN spend_items.checkpoint_id IS 'Optional link to a spend-mode checkpoint (one-to-one when present).';
