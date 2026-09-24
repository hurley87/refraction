/**
 * When the check-in dialog closes (points screen or cancel), reopen the map
 * card for that place so the member lands back on the location — including
 * after creating a place then dismissing check-in without earning points.
 */
export function shouldReopenMapCardAfterCheckInClose(
  hasCheckInTarget: boolean
): boolean {
  return hasCheckInTarget;
}

/**
 * Post-welcome-tour path: the first search leads to the save-to-list tip. If the
 * member checks in (or creates then skips check-in) instead, restore that tip
 * when they return to the map card.
 */
export function shouldShowSaveToListTipAfterCheckIn(args: {
  hasCheckInTarget: boolean;
  saveToListTipAlreadyShowing: boolean;
  postTourFirstSearchPending: boolean;
}): boolean {
  if (!args.hasCheckInTarget) return false;
  return args.saveToListTipAlreadyShowing || args.postTourFirstSearchPending;
}
