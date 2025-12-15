/**
 * @deprecated This file is maintained for backward compatibility.
 * New code should import directly from lib/db/* modules.
 *
 * This file re-exports all database functions and types from the new modular structure.
 */

// Re-export Supabase client
export { supabase } from "./db/client";

// Re-export all types
export type {
  Player,
      Location,
  PlayerLocationCheckin,
  LeaderboardEntry,
  LocationList,
  LocationListWithCount,
  LocationListLocation,
  LocationOption,
  Perk,
  PerkDiscountCode,
  UserPerkRedemption,
  Tier,
  UserProfile,
  NumberAssignment,
  Notification,
  WebhookNotification,
  Checkin,
} from "./types";

// Re-export player functions
export {
  createOrUpdatePlayer,
  getPlayerByWallet,
  getPlayerBySolanaWallet,
  getPlayerByStellarWallet,
  getPlayerByEmail,
  createOrUpdatePlayerForSolana,
  createOrUpdatePlayerForStellar,
  updatePlayerPoints,
} from "./db/players";

// Re-export location functions
export {
  createOrGetLocation,
  listAllLocations,
  listLocationsByWallet,
  updateLocationById,
  listLocationOptions,
} from "./db/locations";

// Re-export location list functions
export {
  getLocationLists,
  createLocationList,
  updateLocationList,
  deleteLocationList,
  getLocationsForList,
  addLocationToList,
  removeLocationFromList,
} from "./db/location-lists";

// Re-export checkin functions
export {
  checkUserLocationCheckin,
  createLocationCheckin,
  insertCheckin,
  upsertCheckpoint,
  getCheckinByAddress,
  getCheckinByAddressAndCheckpoint,
} from "./db/checkins";

// Re-export leaderboard functions
export { getLeaderboard, getPlayerStats } from "./db/leaderboard";

// Re-export perk functions
export {
  createPerk,
  updatePerk,
  deletePerk,
  getAllPerks,
  getPerkById,
  getAvailablePerksForUser,
  redeemPerk,
  getUserPerkRedemptions,
  createDiscountCodes,
  getDiscountCodesByPerkId,
  deleteDiscountCode,
  getAvailableCodesCount,
} from "./db/perks";

// Re-export tier functions
export {
  getTiers,
  resolveTierForPoints,
  getTierForPoints,
} from "./db/tiers";

// Re-export profile functions
export {
  createOrUpdateUserProfile,
  getUserProfile,
  updateUserProfile,
  awardProfileFieldPoints,
} from "./db/profiles";

// Re-export admin functions
export { ADMIN_EMAILS, checkAdminPermission } from "./db/admin";

// Re-export notification functions
export { insertNotification } from "./db/notifications";
