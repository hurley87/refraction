-- Points Activity System Database Schema
-- This schema supports the comprehensive points system with activities, multipliers, requirements, and achievements

-- Main points activities table - stores individual point-earning events
CREATE TABLE points_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet_address VARCHAR(42) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    points_earned INTEGER NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    
    -- Indexes for performance
    CONSTRAINT valid_wallet_address CHECK (user_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT positive_points CHECK (points_earned >= 0)
);

-- User points summary table - aggregated user stats
CREATE TABLE user_points (
    user_wallet_address VARCHAR(42) PRIMARY KEY,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_checkin_date DATE,
    total_referrals INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 8) DEFAULT 0,
    account_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_wallet_address CHECK (user_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT positive_points CHECK (total_points >= 0),
    CONSTRAINT positive_level CHECK (current_level >= 1)
);

-- Daily points tracking table - for enforcing daily limits
CREATE TABLE daily_points_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet_address VARCHAR(42) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    points_earned INTEGER DEFAULT 0,
    activity_count INTEGER DEFAULT 0,
    
    UNIQUE(user_wallet_address, activity_type, date),
    CONSTRAINT valid_wallet_address CHECK (user_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT positive_points CHECK (points_earned >= 0)
);

-- Activity cooldowns table - for enforcing time-based restrictions
CREATE TABLE activity_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet_address VARCHAR(42) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL,
    next_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    UNIQUE(user_wallet_address, activity_type),
    CONSTRAINT valid_wallet_address CHECK (user_wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- User achievements table - tracks unlocked achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet_address VARCHAR(42) NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_awarded INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(user_wallet_address, achievement_type),
    CONSTRAINT valid_wallet_address CHECK (user_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT positive_points CHECK (points_awarded >= 0)
);

-- User referrals table - tracks referral relationships
CREATE TABLE user_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_wallet_address VARCHAR(42) NOT NULL,
    referred_wallet_address VARCHAR(42) NOT NULL,
    referral_code VARCHAR(20),
    signup_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_transaction_at TIMESTAMP WITH TIME ZONE,
    signup_points_awarded BOOLEAN DEFAULT false,
    transaction_points_awarded BOOLEAN DEFAULT false,
    
    UNIQUE(referred_wallet_address),
    CONSTRAINT valid_referrer_wallet CHECK (referrer_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_referred_wallet CHECK (referred_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT different_addresses CHECK (referrer_wallet_address != referred_wallet_address)
);

-- Leaderboard table - for efficient leaderboard queries
CREATE TABLE leaderboard (
    rank INTEGER NOT NULL,
    user_wallet_address VARCHAR(42) NOT NULL,
    username VARCHAR(100),
    total_points INTEGER NOT NULL,
    badge_level INTEGER NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY(rank),
    UNIQUE(user_wallet_address),
    CONSTRAINT valid_wallet_address CHECK (user_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT positive_points CHECK (total_points >= 0),
    CONSTRAINT positive_rank CHECK (rank > 0)
);

-- Point activity configuration table (optional - for dynamic configuration)
CREATE TABLE points_activity_config (
    activity_type VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    category VARCHAR(20) NOT NULL,
    base_points INTEGER NOT NULL,
    max_daily_points INTEGER,
    max_total_points INTEGER,
    cooldown_hours INTEGER,
    multiplier_conditions JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_base_points CHECK (base_points >= 0)
);

-- Indexes for performance optimization
CREATE INDEX idx_points_activities_user_wallet ON points_activities(user_wallet_address);
CREATE INDEX idx_points_activities_activity_type ON points_activities(activity_type);
CREATE INDEX idx_points_activities_created_at ON points_activities(created_at);
CREATE INDEX idx_points_activities_user_type_date ON points_activities(user_wallet_address, activity_type, created_at);

CREATE INDEX idx_user_points_total_points ON user_points(total_points DESC);
CREATE INDEX idx_user_points_level ON user_points(current_level);
CREATE INDEX idx_user_points_last_activity ON user_points(last_activity_at);

CREATE INDEX idx_daily_points_user_date ON daily_points_tracking(user_wallet_address, date);
CREATE INDEX idx_daily_points_activity_date ON daily_points_tracking(activity_type, date);

CREATE INDEX idx_cooldowns_user_activity ON activity_cooldowns(user_wallet_address, activity_type);
CREATE INDEX idx_cooldowns_next_available ON activity_cooldowns(next_available_at);

CREATE INDEX idx_achievements_user ON user_achievements(user_wallet_address);
CREATE INDEX idx_achievements_type ON user_achievements(achievement_type);

CREATE INDEX idx_referrals_referrer ON user_referrals(referrer_wallet_address);
CREATE INDEX idx_referrals_referred ON user_referrals(referred_wallet_address);
CREATE INDEX idx_referrals_code ON user_referrals(referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX idx_leaderboard_points ON leaderboard(total_points DESC);
CREATE INDEX idx_leaderboard_level ON leaderboard(badge_level);

-- Functions and triggers for automatic updates

-- Function to update user points when new activity is added
CREATE OR REPLACE FUNCTION update_user_points_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user_points
    INSERT INTO user_points (user_wallet_address, total_points, last_activity_at)
    VALUES (NEW.user_wallet_address, NEW.points_earned, NEW.created_at)
    ON CONFLICT (user_wallet_address) 
    DO UPDATE SET 
        total_points = user_points.total_points + NEW.points_earned,
        last_activity_at = NEW.created_at;
    
    -- Update daily tracking
    INSERT INTO daily_points_tracking (user_wallet_address, activity_type, date, points_earned, activity_count)
    VALUES (NEW.user_wallet_address, NEW.activity_type, DATE(NEW.created_at), NEW.points_earned, 1)
    ON CONFLICT (user_wallet_address, activity_type, date)
    DO UPDATE SET 
        points_earned = daily_points_tracking.points_earned + NEW.points_earned,
        activity_count = daily_points_tracking.activity_count + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user points
CREATE TRIGGER trigger_update_user_points
    AFTER INSERT ON points_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_user_points_on_activity();

-- Function to update user level based on points
CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Level calculation logic (customize as needed)
    CASE 
        WHEN points < 100 THEN RETURN 1;
        WHEN points < 250 THEN RETURN 2;
        WHEN points < 500 THEN RETURN 3;
        WHEN points < 750 THEN RETURN 4;
        WHEN points < 1000 THEN RETURN 5;
        WHEN points < 1500 THEN RETURN 6;
        WHEN points < 2000 THEN RETURN 7;
        WHEN points < 3000 THEN RETURN 8;
        WHEN points < 5000 THEN RETURN 9;
        ELSE RETURN 10;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to update leaderboard (run periodically)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
    -- Clear existing leaderboard
    DELETE FROM leaderboard;
    
    -- Populate leaderboard with ranked users
    INSERT INTO leaderboard (rank, user_wallet_address, username, total_points, badge_level, badge_name)
    SELECT 
        ROW_NUMBER() OVER (ORDER BY up.total_points DESC) as rank,
        up.user_wallet_address,
        COALESCE(u.username, CONCAT('User ', SUBSTRING(up.user_wallet_address FROM 1 FOR 8))) as username,
        up.total_points,
        calculate_user_level(up.total_points) as badge_level,
        CASE 
            WHEN calculate_user_level(up.total_points) >= 10 THEN 'Master'
            WHEN calculate_user_level(up.total_points) >= 8 THEN 'Expert'
            WHEN calculate_user_level(up.total_points) >= 6 THEN 'Advanced'
            WHEN calculate_user_level(up.total_points) >= 4 THEN 'Intermediate'
            WHEN calculate_user_level(up.total_points) >= 2 THEN 'Beginner'
            ELSE 'Novice'
        END as badge_name
    FROM user_points up
    LEFT JOIN users u ON u.wallet_address = up.user_wallet_address  -- Assuming you have a users table
    WHERE up.total_points > 0
    ORDER BY up.total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample data population (for testing)
INSERT INTO points_activity_config (activity_type, name, description, icon, category, base_points, max_daily_points, is_active) VALUES
('daily_checkin', 'Daily Check-in', 'Check in daily to earn points', '📅', 'engagement', 10, 10, true),
('wallet_connect', 'Connect Wallet', 'Connect your first wallet', '💳', 'onboarding', 50, NULL, true),
('transaction_complete', 'Complete Transaction', 'Complete a transaction', '💸', 'trading', 25, 500, true),
('social_share', 'Social Share', 'Share on social media', '📢', 'social', 20, 100, true),
('referral_signup', 'Referral Signup', 'Friend signs up using your code', '👥', 'referral', 100, NULL, true);

-- Helpful queries for the application

-- Query to get user's current points and level
-- SELECT 
--     user_wallet_address,
--     total_points,
--     calculate_user_level(total_points) as current_level,
--     current_streak,
--     total_referrals
-- FROM user_points 
-- WHERE user_wallet_address = $1;

-- Query to get user's recent activity
-- SELECT 
--     pa.activity_type,
--     pa.points_earned,
--     pa.description,
--     pa.created_at,
--     pac.icon,
--     pac.category
-- FROM points_activities pa
-- JOIN points_activity_config pac ON pa.activity_type = pac.activity_type
-- WHERE pa.user_wallet_address = $1
-- ORDER BY pa.created_at DESC
-- LIMIT 20;

-- Query to check daily limits
-- SELECT 
--     activity_type,
--     points_earned,
--     activity_count
-- FROM daily_points_tracking
-- WHERE user_wallet_address = $1 
-- AND date = CURRENT_DATE;

-- Query to get leaderboard
-- SELECT 
--     rank,
--     username,
--     total_points,
--     badge_level,
--     badge_name
-- FROM leaderboard
-- ORDER BY rank
-- LIMIT 100; 