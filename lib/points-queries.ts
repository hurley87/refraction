// Points System Database Queries
// These queries work with the points system database schema

export interface DbClient {
  userStats;
  query: (sql: string, params?: any[]) => Promise<any>;
}

// Award points to a user for completing an activity
export async function awardPoints(
  db: DbClient,
  userWalletAddress: string,
  activityType: string,
  pointsEarned: number,
  description: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  try {
    // Check if activity exists and is active
    const configResult = await db.query(
      "SELECT * FROM points_activity_config WHERE activity_type = $1 AND is_active = true",
      [activityType]
    );

    if (configResult.rows.length === 0) {
      return { success: false, error: "Activity type not found or inactive" };
    }

    const config = configResult.rows[0];

    // Check daily limits
    if (config.max_daily_points) {
      const dailyResult = await db.query(
        "SELECT points_earned FROM daily_points_tracking WHERE user_wallet_address = $1 AND activity_type = $2 AND date = CURRENT_DATE",
        [userWalletAddress, activityType]
      );

      const currentDailyPoints = dailyResult.rows[0]?.points_earned || 0;
      if (currentDailyPoints + pointsEarned > config.max_daily_points) {
        return { success: false, error: "Daily points limit exceeded" };
      }
    }

    // Check total limits
    if (config.max_total_points) {
      const totalResult = await db.query(
        "SELECT SUM(points_earned) as total FROM points_activities WHERE user_wallet_address = $1 AND activity_type = $2",
        [userWalletAddress, activityType]
      );

      const currentTotalPoints = totalResult.rows[0]?.total || 0;
      if (currentTotalPoints + pointsEarned > config.max_total_points) {
        return { success: false, error: "Total points limit exceeded" };
      }
    }

    // Check cooldown
    if (config.cooldown_hours) {
      const cooldownResult = await db.query(
        "SELECT next_available_at FROM activity_cooldowns WHERE user_wallet_address = $1 AND activity_type = $2",
        [userWalletAddress, activityType]
      );

      if (cooldownResult.rows.length > 0) {
        const nextAvailable = new Date(
          cooldownResult.rows[0].next_available_at
        );
        if (new Date() < nextAvailable) {
          return { success: false, error: "Activity is on cooldown" };
        }
      }
    }

    // Award the points
    const result = await db.query(
      "INSERT INTO points_activities (user_wallet_address, activity_type, points_earned, description, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [
        userWalletAddress,
        activityType,
        pointsEarned,
        description,
        JSON.stringify(metadata),
      ]
    );

    // Update cooldown if needed
    if (config.cooldown_hours) {
      const nextAvailable = new Date(
        Date.now() + config.cooldown_hours * 60 * 60 * 1000
      );
      await db.query(
        "INSERT INTO activity_cooldowns (user_wallet_address, activity_type, last_activity_at, next_available_at) VALUES ($1, $2, NOW(), $3) ON CONFLICT (user_wallet_address, activity_type) DO UPDATE SET last_activity_at = NOW(), next_available_at = $3",
        [userWalletAddress, activityType, nextAvailable]
      );
    }

    return { success: true, activityId: result.rows[0].id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get user's current points and stats
export async function getUserStats(db: DbClient, userWalletAddress: string) {
  const result = await db.query(
    `SELECT 
      user_wallet_address,
      total_points,
      calculate_user_level(total_points) as current_level,
      current_streak,
      longest_streak,
      total_referrals,
      total_transactions,
      total_volume,
      last_checkin_date,
      account_created_at,
      last_activity_at
    FROM user_points 
    WHERE user_wallet_address = $1`,
    [userWalletAddress]
  );

  if (result.rows.length === 0) {
    // Create initial user record
    await db.query(
      "INSERT INTO user_points (user_wallet_address) VALUES ($1)",
      [userWalletAddress]
    );

    return {
      user_wallet_address: userWalletAddress,
      total_points: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0,
      total_referrals: 0,
      total_transactions: 0,
      total_volume: 0,
      last_checkin_date: null,
      account_created_at: new Date(),
      last_activity_at: new Date(),
    };
  }

  return result.rows[0];
}

// Get user's recent activity
export async function getUserActivity(
  db: DbClient,
  userWalletAddress: string,
  limit: number = 20
) {
  const result = await db.query(
    `SELECT 
      pa.id,
      pa.activity_type,
      pa.points_earned,
      pa.description,
      pa.created_at,
      pa.metadata,
      pac.icon,
      pac.category,
      pac.name
    FROM points_activities pa
    LEFT JOIN points_activity_config pac ON pa.activity_type = pac.activity_type
    WHERE pa.user_wallet_address = $1
    ORDER BY pa.created_at DESC
    LIMIT $2`,
    [userWalletAddress, limit]
  );

  return result.rows;
}

// Check if user can perform an activity (daily limits, cooldowns, etc.)
export async function canPerformActivity(
  db: DbClient,
  userWalletAddress: string,
  activityType: string
) {
  try {
    // Get activity config
    const configResult = await db.query(
      "SELECT * FROM points_activity_config WHERE activity_type = $1 AND is_active = true",
      [activityType]
    );

    if (configResult.rows.length === 0) {
      return { canPerform: false, reason: "Activity not found or inactive" };
    }

    const config = configResult.rows[0];

    // Check daily limits
    if (config.max_daily_points) {
      const dailyResult = await db.query(
        "SELECT points_earned FROM daily_points_tracking WHERE user_wallet_address = $1 AND activity_type = $2 AND date = CURRENT_DATE",
        [userWalletAddress, activityType]
      );

      const currentDailyPoints = dailyResult.rows[0]?.points_earned || 0;
      if (currentDailyPoints >= config.max_daily_points) {
        return { canPerform: false, reason: "Daily limit reached" };
      }
    }

    // Check total limits
    if (config.max_total_points) {
      const totalResult = await db.query(
        "SELECT SUM(points_earned) as total FROM points_activities WHERE user_wallet_address = $1 AND activity_type = $2",
        [userWalletAddress, activityType]
      );

      const currentTotalPoints = totalResult.rows[0]?.total || 0;
      if (currentTotalPoints >= config.max_total_points) {
        return { canPerform: false, reason: "Total limit reached" };
      }
    }

    // Check cooldown
    if (config.cooldown_hours) {
      const cooldownResult = await db.query(
        "SELECT next_available_at FROM activity_cooldowns WHERE user_wallet_address = $1 AND activity_type = $2",
        [userWalletAddress, activityType]
      );

      if (cooldownResult.rows.length > 0) {
        const nextAvailable = new Date(
          cooldownResult.rows[0].next_available_at
        );
        if (new Date() < nextAvailable) {
          return {
            canPerform: false,
            reason: "On cooldown",
            nextAvailableAt: nextAvailable,
          };
        }
      }
    }

    return { canPerform: true };
  } catch (error) {
    return {
      canPerform: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get leaderboard
export async function getLeaderboard(
  db: DbClient,
  limit: number = 100,
  offset: number = 0
) {
  const result = await db.query(
    `SELECT 
      rank,
      user_wallet_address,
      username,
      total_points,
      badge_level,
      badge_name
    FROM leaderboard
    ORDER BY rank
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

// Get user's rank
export async function getUserRank(db: DbClient, userWalletAddress: string) {
  const result = await db.query(
    "SELECT rank, total_points, badge_level, badge_name FROM leaderboard WHERE user_wallet_address = $1",
    [userWalletAddress]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// Update daily streak
export async function updateDailyStreak(
  db: DbClient,
  userWalletAddress: string
) {
  const result = await db.query(
    `UPDATE user_points 
    SET 
      current_streak = CASE 
        WHEN last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
        WHEN last_checkin_date = CURRENT_DATE THEN current_streak
        ELSE 1
      END,
      longest_streak = CASE 
        WHEN last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN GREATEST(longest_streak, current_streak + 1)
        WHEN last_checkin_date = CURRENT_DATE THEN longest_streak
        ELSE GREATEST(longest_streak, 1)
      END,
      last_checkin_date = CURRENT_DATE
    WHERE user_wallet_address = $1
    RETURNING current_streak, longest_streak`,
    [userWalletAddress]
  );

  return result.rows[0];
}

// Create referral relationship
export async function createReferral(
  db: DbClient,
  referrerWalletAddress: string,
  referredWalletAddress: string,
  referralCode?: string
) {
  try {
    await db.query(
      "INSERT INTO user_referrals (referrer_wallet_address, referred_wallet_address, referral_code) VALUES ($1, $2, $3)",
      [referrerWalletAddress, referredWalletAddress, referralCode]
    );

    // Award referral signup points
    await awardPoints(
      db,
      referrerWalletAddress,
      "referral_signup",
      100,
      "Friend signed up using your referral code"
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Mark referral as having completed first transaction
export async function markReferralTransactionComplete(
  db: DbClient,
  referredWalletAddress: string
) {
  try {
    // Get the referrer
    const result = await db.query(
      "SELECT referrer_wallet_address FROM user_referrals WHERE referred_wallet_address = $1 AND transaction_points_awarded = false",
      [referredWalletAddress]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: "No referral found or already processed",
      };
    }

    const referrerWalletAddress = result.rows[0].referrer_wallet_address;

    // Award points to referrer
    await awardPoints(
      db,
      referrerWalletAddress,
      "referral_complete",
      250,
      "Your referral completed their first transaction"
    );

    // Mark as processed
    await db.query(
      "UPDATE user_referrals SET first_transaction_at = NOW(), transaction_points_awarded = true WHERE referred_wallet_address = $1",
      [referredWalletAddress]
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get user's referral stats
export async function getUserReferralStats(
  db: DbClient,
  userWalletAddress: string
) {
  const result = await db.query(
    `SELECT 
      COUNT(*) as total_referrals,
      COUNT(CASE WHEN first_transaction_at IS NOT NULL THEN 1 END) as completed_referrals,
      SUM(CASE WHEN signup_points_awarded THEN 100 ELSE 0 END + CASE WHEN transaction_points_awarded THEN 250 ELSE 0 END) as total_referral_points
    FROM user_referrals 
    WHERE referrer_wallet_address = $1`,
    [userWalletAddress]
  );

  return result.rows[0];
}

// Batch update user levels based on points
export async function updateUserLevels(db: DbClient) {
  await db.query(
    `UPDATE user_points 
    SET current_level = calculate_user_level(total_points)
    WHERE current_level != calculate_user_level(total_points)`
  );
}

// Get activities available to user (considering requirements)
export async function getAvailableActivities(
  db: DbClient,
  userWalletAddress: string
) {
  const result = await db.query(
    "SELECT * FROM points_activity_config WHERE is_active = true ORDER BY category, base_points"
  );

  const activities = result.rows.map((activity) => ({
    ...activity,
    available: true, // You can add requirement checking logic here
    dailyLimitReached: false, // Check against daily_points_tracking
    totalLimitReached: false, // Check against total points for this activity
    onCooldown: false, // Check against activity_cooldowns
  }));

  return activities;
}

// Analytics: Get points distribution by activity type
export async function getPointsAnalytics(
  db: DbClient,
  userWalletAddress?: string,
  days: number = 30
) {
  let query =
    `
    SELECT 
      pa.activity_type,
      pac.name,
      pac.category,
      COUNT(*) as activity_count,
      SUM(pa.points_earned) as total_points,
      AVG(pa.points_earned) as avg_points
    FROM points_activities pa
    JOIN points_activity_config pac ON pa.activity_type = pac.activity_type
    WHERE pa.created_at >= NOW() - INTERVAL '` +
    days +
    ` days'
  `;

  const params: any[] = [];
  if (userWalletAddress) {
    query += " AND pa.user_wallet_address = $1";
    params.push(userWalletAddress);
  }

  query += `
    GROUP BY pa.activity_type, pac.name, pac.category
    ORDER BY total_points DESC
  `;

  const result = await db.query(query, params);
  return result.rows;
}

// Utility function to refresh leaderboard
export async function refreshLeaderboard(db: DbClient) {
  await db.query("SELECT refresh_leaderboard()");
}
