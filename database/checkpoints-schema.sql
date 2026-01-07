-- Unified checkpoints table for /c/[id] URLs
-- Supports EVM, Solana, and Stellar wallet types

CREATE TABLE IF NOT EXISTS checkpoints (
    id VARCHAR(12) PRIMARY KEY,  -- Short nanoid for URL-friendly IDs (e.g., /c/abc123xyz)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    chain_type VARCHAR(20) NOT NULL CHECK (chain_type IN ('evm', 'solana', 'stellar')),
    points_value INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(255),  -- Admin email who created it
    partner_image_url TEXT,  -- Optional partner logo image URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for looking up active checkpoints
CREATE INDEX IF NOT EXISTS idx_checkpoints_active ON checkpoints(is_active) WHERE is_active = true;

-- Index for admin filtering by creator
CREATE INDEX IF NOT EXISTS idx_checkpoints_created_by ON checkpoints(created_by);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_checkpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS checkpoints_updated_at_trigger ON checkpoints;
CREATE TRIGGER checkpoints_updated_at_trigger
    BEFORE UPDATE ON checkpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_checkpoints_updated_at();

-- Enable RLS
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to active checkpoints
CREATE POLICY "Allow public read of active checkpoints"
    ON checkpoints
    FOR SELECT
    USING (is_active = true);

-- Policy for service role to manage all checkpoints
CREATE POLICY "Allow service role full access"
    ON checkpoints
    USING (true)
    WITH CHECK (true);
