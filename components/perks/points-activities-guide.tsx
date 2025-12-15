"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  POINTS_ACTIVITIES_CONFIG,
  getActivitiesByCategory,
  PointsCategory,
  PointsActivityConfig,
} from "@/lib/points-activities";
import {
  Trophy,
  Users,
  TrendingUp,
  Heart,
  Star,
  Zap,
  Gift,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const categoryIcons: Record<PointsCategory, React.ReactNode> = {
  onboarding: <Zap className="w-4 h-4" />,
  engagement: <Heart className="w-4 h-4" />,
  trading: <TrendingUp className="w-4 h-4" />,
  social: <Users className="w-4 h-4" />,
  community: <Users className="w-4 h-4" />,
  referral: <Gift className="w-4 h-4" />,
  achievement: <Trophy className="w-4 h-4" />,
  special: <Star className="w-4 h-4" />,
};

const categoryColors: Record<PointsCategory, string> = {
  onboarding: "bg-blue-100 text-blue-800",
  engagement: "bg-green-100 text-green-800",
  trading: "bg-purple-100 text-purple-800",
  social: "bg-pink-100 text-pink-800",
  community: "bg-orange-100 text-orange-800",
  referral: "bg-teal-100 text-teal-800",
  achievement: "bg-yellow-100 text-yellow-800",
  special: "bg-red-100 text-red-800",
};

interface CategorySectionProps {
  category: PointsCategory;
  activities: PointsActivityConfig[];
}

function CategorySection({ category, activities }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (activities.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-4 mb-4">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-0 h-auto mb-4 hover:bg-transparent"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${categoryColors[category]}`}>
            {categoryIcons[category]}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-inktrap font-semibold text-black capitalize">
              {category} Activities
            </h3>
            <p className="text-sm text-gray-600">
              {activities.length} way{activities.length !== 1 ? "s" : ""} to
              earn points
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </Button>

      {isExpanded && (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.type}
              className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activity.icon}</span>
                  <div>
                    <h4 className="font-inktrap font-medium text-black">
                      {activity.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {activity.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                    +{activity.base_points} pts
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="flex flex-wrap gap-2 mt-3">
                {activity.max_daily_points && (
                  <div className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Max {activity.max_daily_points} pts/day
                  </div>
                )}
                {activity.max_total_points && (
                  <div className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Max {activity.max_total_points} pts total
                  </div>
                )}
                {activity.cooldown_hours && (
                  <div className="text-xs px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full">
                    {activity.cooldown_hours}h cooldown
                  </div>
                )}
                {activity.multiplier_conditions &&
                  activity.multiplier_conditions.length > 0 && (
                    <div className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full">
                      Has multipliers
                    </div>
                  )}
                {activity.requirements && activity.requirements.length > 0 && (
                  <div className="text-xs px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full">
                    Has requirements
                  </div>
                )}
                {!activity.is_active && (
                  <div className="text-xs px-2 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full">
                    Inactive
                  </div>
                )}
              </div>

              {/* Multiplier Conditions */}
              {activity.multiplier_conditions &&
                activity.multiplier_conditions.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <h5 className="text-sm font-medium text-yellow-800 mb-2">
                      Bonus Multipliers:
                    </h5>
                    <ul className="space-y-1">
                      {activity.multiplier_conditions.map(
                        (condition, index) => (
                          <li key={index} className="text-xs text-yellow-700">
                            • {condition.description}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {/* Requirements */}
              {activity.requirements && activity.requirements.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <h5 className="text-sm font-medium text-red-800 mb-2">
                    Requirements:
                  </h5>
                  <ul className="space-y-1">
                    {activity.requirements.map((requirement, index) => (
                      <li key={index} className="text-xs text-red-700">
                        • {requirement.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PointsActivitiesGuide() {
  const categories: PointsCategory[] = [
    "onboarding",
    "engagement",
    "trading",
    "social",
    "community",
    "referral",
    "achievement",
    "special",
  ];

  const totalActivities = POINTS_ACTIVITIES_CONFIG.filter(
    (a) => a.is_active
  ).length;
  const totalPossiblePoints = POINTS_ACTIVITIES_CONFIG.filter(
    (a) => a.is_active
  ).reduce((sum, activity) => {
    // Use max_total_points if available, otherwise use base_points
    return sum + (activity.max_total_points || activity.base_points);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 font-grotesk">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-inktrap font-bold text-black mb-2">
            Points Activities Guide
          </h1>
          <p className="text-gray-600 mb-4">
            Discover all the ways you can earn points on our platform
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-inktrap font-bold text-blue-600">
                {totalActivities}
              </div>
              <div className="text-gray-600">Active Activities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-inktrap font-bold text-purple-600">
                {totalPossiblePoints.toLocaleString()}+
              </div>
              <div className="text-gray-600">Total Points Available</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.map((category) => {
          const activities = getActivitiesByCategory(category);
          return (
            <CategorySection
              key={category}
              category={category}
              activities={activities}
            />
          );
        })}

        {/* Footer Note */}
        <div className="bg-gray-100 rounded-2xl p-6 text-center">
          <h3 className="font-inktrap font-semibold text-black mb-2">
            Pro Tips
          </h3>
          <ul className="text-sm text-gray-600 space-y-2 text-left max-w-2xl mx-auto">
            <li>{`• Daily activities reset every 24 hours - don't miss out!`}</li>
            <li>• Maintain streaks for bonus multipliers on daily check-ins</li>
            <li>
              • Some activities have requirements - level up to unlock more
              opportunities
            </li>
            <li>
              • Referral bonuses provide some of the highest point rewards
            </li>
            <li>
              • Special events may activate seasonal activities with
              limited-time bonuses
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
