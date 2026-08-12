/**
 * Whether a member has hit the in-person daily claim cap for a perk.
 * Null/undefined/non-positive max = unlimited.
 */
export function isClaimedToday(
  claimCountToday: number,
  maxClaimsPerMemberPerDay: number | null | undefined
): boolean {
  if (
    maxClaimsPerMemberPerDay == null ||
    !Number.isFinite(maxClaimsPerMemberPerDay) ||
    maxClaimsPerMemberPerDay <= 0
  ) {
    return false;
  }
  return claimCountToday >= maxClaimsPerMemberPerDay;
}
