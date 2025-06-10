export interface PointsActivity {
  id: string;
  user_wallet_address: string;
  activity_type: PointsActivityType;
  points_earned: number;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  processed: boolean;
}

export interface PointsActivityConfig {
  type: PointsActivityType;
  name: string;
  description: string;
  icon: string;
  category: PointsCategory;
  base_points: number;
  max_daily_points?: number;
  max_total_points?: number;
  cooldown_hours?: number;
  multiplier_conditions?: MultiplierCondition[];
  requirements?: ActivityRequirement[];
  is_active: boolean;
}

export type PointsActivityType =
  | "daily_checkin"
  | "profile_complete"
  | "social_share"
  | "referral_signup"
  | "referral_complete"
  | "transaction_complete"
  | "nft_mint"
  | "nft_trade"
  | "community_post"
  | "community_like"
  | "community_comment"
  | "achievement_unlock"
  | "streak_milestone"
  | "level_up"
  | "quest_complete"
  | "event_participation"
  | "beta_testing"
  | "bug_report"
  | "content_creation"
  | "tutorial_complete"
  | "app_rating"
  | "newsletter_signup"
  | "wallet_connect"
  | "first_transaction"
  | "volume_milestone"
  | "loyalty_bonus"
  | "seasonal_event"
  | "partnership_activity";

export type PointsCategory =
  | "engagement"
  | "social"
  | "trading"
  | "referral"
  | "achievement"
  | "onboarding"
  | "community"
  | "special";

export interface MultiplierCondition {
  condition_type:
    | "streak"
    | "volume"
    | "level"
    | "time_based"
    | "referral_count";
  threshold: number;
  multiplier: number;
  description: string;
}

export interface ActivityRequirement {
  requirement_type:
    | "min_level"
    | "kyc_verified"
    | "min_transactions"
    | "account_age_days";
  value: number;
  description: string;
}

// Comprehensive points activities configuration
export const POINTS_ACTIVITIES_CONFIG: PointsActivityConfig[] = [
  // Onboarding Activities
  {
    type: "wallet_connect",
    name: "Connect Wallet",
    description: "Connect your first wallet to the platform",
    icon: "💳",
    category: "onboarding",
    base_points: 50,
    max_total_points: 50,
    is_active: true,
  },
  {
    type: "profile_complete",
    name: "Complete Profile",
    description: "Fill out your complete user profile",
    icon: "👤",
    category: "onboarding",
    base_points: 100,
    max_total_points: 100,
    is_active: true,
  },
  {
    type: "tutorial_complete",
    name: "Complete Tutorial",
    description: "Finish the platform tutorial",
    icon: "🎓",
    category: "onboarding",
    base_points: 75,
    max_total_points: 75,
    is_active: true,
  },

  // Daily Engagement
  {
    type: "daily_checkin",
    name: "Daily Check-in",
    description: "Check in daily to earn points",
    icon: "📅",
    category: "engagement",
    base_points: 10,
    max_daily_points: 10,
    multiplier_conditions: [
      {
        condition_type: "streak",
        threshold: 7,
        multiplier: 1.5,
        description: "1.5x points for 7+ day streak",
      },
      {
        condition_type: "streak",
        threshold: 30,
        multiplier: 2.0,
        description: "2x points for 30+ day streak",
      },
    ],
    is_active: true,
  },

  // Trading Activities
  {
    type: "first_transaction",
    name: "First Transaction",
    description: "Complete your first transaction",
    icon: "🎯",
    category: "trading",
    base_points: 200,
    max_total_points: 200,
    is_active: true,
  },
  {
    type: "transaction_complete",
    name: "Transaction Complete",
    description: "Complete a transaction",
    icon: "💸",
    category: "trading",
    base_points: 25,
    max_daily_points: 500,
    is_active: true,
  },
  {
    type: "volume_milestone",
    name: "Volume Milestone",
    description: "Reach trading volume milestones",
    icon: "📈",
    category: "trading",
    base_points: 500,
    multiplier_conditions: [
      {
        condition_type: "volume",
        threshold: 1000,
        multiplier: 1.0,
        description: "500 points for $1K volume",
      },
      {
        condition_type: "volume",
        threshold: 10000,
        multiplier: 2.0,
        description: "1000 points for $10K volume",
      },
      {
        condition_type: "volume",
        threshold: 100000,
        multiplier: 5.0,
        description: "2500 points for $100K volume",
      },
    ],
    is_active: true,
  },

  // NFT Activities
  {
    type: "nft_mint",
    name: "NFT Mint",
    description: "Mint an NFT on the platform",
    icon: "🎨",
    category: "trading",
    base_points: 150,
    max_daily_points: 750,
    is_active: true,
  },
  {
    type: "nft_trade",
    name: "NFT Trade",
    description: "Buy or sell an NFT",
    icon: "🖼️",
    category: "trading",
    base_points: 100,
    max_daily_points: 1000,
    is_active: true,
  },

  // Social & Community
  {
    type: "social_share",
    name: "Social Share",
    description: "Share content on social media",
    icon: "📢",
    category: "social",
    base_points: 20,
    max_daily_points: 100,
    cooldown_hours: 1,
    is_active: true,
  },
  {
    type: "community_post",
    name: "Community Post",
    description: "Create a post in the community",
    icon: "✍️",
    category: "community",
    base_points: 30,
    max_daily_points: 150,
    is_active: true,
  },
  {
    type: "community_like",
    name: "Like Post",
    description: "Like a community post",
    icon: "👍",
    category: "community",
    base_points: 5,
    max_daily_points: 50,
    is_active: true,
  },
  {
    type: "community_comment",
    name: "Comment on Post",
    description: "Comment on a community post",
    icon: "💬",
    category: "community",
    base_points: 15,
    max_daily_points: 150,
    is_active: true,
  },

  // Referral System
  {
    type: "referral_signup",
    name: "Referral Signup",
    description: "Someone signs up using your referral code",
    icon: "👥",
    category: "referral",
    base_points: 100,
    is_active: true,
  },
  {
    type: "referral_complete",
    name: "Referral Completes First Transaction",
    description: "Your referral completes their first transaction",
    icon: "🎁",
    category: "referral",
    base_points: 250,
    is_active: true,
  },

  // Achievements & Milestones
  {
    type: "achievement_unlock",
    name: "Achievement Unlocked",
    description: "Unlock a platform achievement",
    icon: "🏆",
    category: "achievement",
    base_points: 100,
    is_active: true,
  },
  {
    type: "level_up",
    name: "Level Up",
    description: "Advance to the next level",
    icon: "⬆️",
    category: "achievement",
    base_points: 200,
    multiplier_conditions: [
      {
        condition_type: "level",
        threshold: 10,
        multiplier: 1.5,
        description: "1.5x points for level 10+",
      },
      {
        condition_type: "level",
        threshold: 25,
        multiplier: 2.0,
        description: "2x points for level 25+",
      },
    ],
    is_active: true,
  },
  {
    type: "streak_milestone",
    name: "Streak Milestone",
    description: "Reach consecutive day milestones",
    icon: "🔥",
    category: "achievement",
    base_points: 150,
    multiplier_conditions: [
      {
        condition_type: "streak",
        threshold: 7,
        multiplier: 1.0,
        description: "150 points for 7-day streak",
      },
      {
        condition_type: "streak",
        threshold: 30,
        multiplier: 3.0,
        description: "450 points for 30-day streak",
      },
      {
        condition_type: "streak",
        threshold: 100,
        multiplier: 10.0,
        description: "1500 points for 100-day streak",
      },
    ],
    is_active: true,
  },

  // Special Activities
  {
    type: "beta_testing",
    name: "Beta Testing",
    description: "Participate in beta testing features",
    icon: "🧪",
    category: "special",
    base_points: 300,
    is_active: true,
  },
  {
    type: "bug_report",
    name: "Bug Report",
    description: "Report a valid bug",
    icon: "🐛",
    category: "special",
    base_points: 150,
    max_daily_points: 500,
    is_active: true,
  },
  {
    type: "content_creation",
    name: "Content Creation",
    description: "Create educational or promotional content",
    icon: "📝",
    category: "special",
    base_points: 500,
    requirements: [
      {
        requirement_type: "min_level",
        value: 5,
        description: "Must be level 5 or higher",
      },
    ],
    is_active: true,
  },
  {
    type: "app_rating",
    name: "App Rating",
    description: "Rate the app in the app store",
    icon: "⭐",
    category: "engagement",
    base_points: 75,
    max_total_points: 75,
    is_active: true,
  },
  {
    type: "newsletter_signup",
    name: "Newsletter Signup",
    description: "Subscribe to the newsletter",
    icon: "📧",
    category: "engagement",
    base_points: 25,
    max_total_points: 25,
    is_active: true,
  },

  // Event-based
  {
    type: "event_participation",
    name: "Event Participation",
    description: "Participate in platform events",
    icon: "🎉",
    category: "special",
    base_points: 200,
    is_active: true,
  },
  {
    type: "seasonal_event",
    name: "Seasonal Event",
    description: "Participate in seasonal events",
    icon: "🎄",
    category: "special",
    base_points: 300,
    is_active: false, // Activated during events
  },
  {
    type: "partnership_activity",
    name: "Partnership Activity",
    description: "Complete activities with partner platforms",
    icon: "🤝",
    category: "special",
    base_points: 400,
    is_active: true,
  },

  // Loyalty & Retention
  {
    type: "loyalty_bonus",
    name: "Loyalty Bonus",
    description: "Monthly bonus for active users",
    icon: "💎",
    category: "special",
    base_points: 500,
    requirements: [
      {
        requirement_type: "account_age_days",
        value: 30,
        description: "Account must be 30+ days old",
      },
      {
        requirement_type: "min_transactions",
        value: 10,
        description: "Must have completed 10+ transactions",
      },
    ],
    is_active: true,
  },
];

// Helper functions
export function getActivityConfig(
  type: PointsActivityType
): PointsActivityConfig | undefined {
  return POINTS_ACTIVITIES_CONFIG.find((config) => config.type === type);
}

export function getActiveActivities(): PointsActivityConfig[] {
  return POINTS_ACTIVITIES_CONFIG.filter((config) => config.is_active);
}

export function getActivitiesByCategory(
  category: PointsCategory
): PointsActivityConfig[] {
  return POINTS_ACTIVITIES_CONFIG.filter(
    (config) => config.category === category && config.is_active
  );
}

export function calculatePointsWithMultipliers(
  activityType: PointsActivityType,
  userLevel: number,
  userStreak: number,
  userVolume: number,
  referralCount: number
): number {
  const config = getActivityConfig(activityType);
  if (!config) return 0;

  let points = config.base_points;

  if (config.multiplier_conditions) {
    for (const condition of config.multiplier_conditions) {
      let shouldApply = false;

      switch (condition.condition_type) {
        case "level":
          shouldApply = userLevel >= condition.threshold;
          break;
        case "streak":
          shouldApply = userStreak >= condition.threshold;
          break;
        case "volume":
          shouldApply = userVolume >= condition.threshold;
          break;
        case "referral_count":
          shouldApply = referralCount >= condition.threshold;
          break;
      }

      if (shouldApply) {
        points = Math.floor(points * condition.multiplier);
      }
    }
  }

  return points;
}

export function validateActivityRequirements(
  activityType: PointsActivityType,
  userLevel: number,
  accountAgeDays: number,
  transactionCount: number,
  isKycVerified: boolean
): { valid: boolean; missingRequirements: string[] } {
  const config = getActivityConfig(activityType);
  if (!config || !config.requirements) {
    return { valid: true, missingRequirements: [] };
  }

  const missingRequirements: string[] = [];

  for (const requirement of config.requirements) {
    let meets = false;

    switch (requirement.requirement_type) {
      case "min_level":
        meets = userLevel >= requirement.value;
        break;
      case "kyc_verified":
        meets = isKycVerified;
        break;
      case "min_transactions":
        meets = transactionCount >= requirement.value;
        break;
      case "account_age_days":
        meets = accountAgeDays >= requirement.value;
        break;
    }

    if (!meets) {
      missingRequirements.push(requirement.description);
    }
  }

  return {
    valid: missingRequirements.length === 0,
    missingRequirements,
  };
}
