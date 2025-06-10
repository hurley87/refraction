-- User Profile Extended Schema
-- Add these columns to your existing players table or create a new user_profiles table

-- Option 1: Extend existing players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS towns_handle VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS farcaster_handle VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS telegram_handle VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Option 2: Create separate user_profiles table (recommended for better organization)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    email VARCHAR(255),
    name VARCHAR(100),
    username VARCHAR(50),
    twitter_handle VARCHAR(50),
    towns_handle VARCHAR(50),
    farcaster_handle VARCHAR(50),
    telegram_handle VARCHAR(50),
    profile_picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_wallet_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_twitter_handle CHECK (twitter_handle IS NULL OR twitter_handle ~ '^[A-Za-z0-9_]{1,15}$'),
    CONSTRAINT valid_towns_handle CHECK (towns_handle IS NULL OR length(towns_handle) <= 50),
    CONSTRAINT valid_farcaster_handle CHECK (farcaster_handle IS NULL OR length(farcaster_handle) <= 50),
    CONSTRAINT valid_telegram_handle CHECK (telegram_handle IS NULL OR telegram_handle ~ '^[A-Za-z0-9_]{5,32}$')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet ON user_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Insert sample data (optional)
-- INSERT INTO user_profiles (wallet_address, email, name, username) VALUES 
-- ('0x1234567890123456789012345678901234567890', 'user@example.com', 'John Doe', 'johndoe'); 