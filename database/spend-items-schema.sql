-- Spend Items: Items users can spend points on (points are deducted)
-- For checkpoint-linked spend flow, each user can redeem once per item.

-- Spend items table
CREATE TABLE IF NOT EXISTS spend_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkpoint_id VARCHAR(12) REFERENCES checkpoints(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spend redemptions table
CREATE TABLE IF NOT EXISTS spend_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spend_item_id UUID NOT NULL REFERENCES spend_items(id) ON DELETE CASCADE,
  user_wallet_address TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  is_fulfilled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spend_items_is_active ON spend_items(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_items_checkpoint_id_unique ON spend_items(checkpoint_id) WHERE checkpoint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spend_redemptions_wallet ON spend_redemptions(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_spend_redemptions_item ON spend_redemptions(spend_item_id);
CREATE INDEX IF NOT EXISTS idx_spend_redemptions_fulfilled ON spend_redemptions(is_fulfilled);
CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_redemptions_item_wallet_unique ON spend_redemptions(spend_item_id, user_wallet_address);

-- Enable RLS
ALTER TABLE spend_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_redemptions ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for server-side operations)
CREATE POLICY "Service role full access on spend_items"
  ON spend_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on spend_redemptions"
  ON spend_redemptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at on spend_items
CREATE OR REPLACE FUNCTION update_spend_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spend_items_updated_at
  BEFORE UPDATE ON spend_items
  FOR EACH ROW
  EXECUTE FUNCTION update_spend_items_updated_at();
