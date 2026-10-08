/**
 * A reward with one-time codes has nothing to show until redeem assigns one.
 * Universal codes and codes already on the member's redemption skip that call.
 */
export function shouldIssueIndividualDiscountCode(input: {
  hasIndividualCodes: boolean;
  universalCode?: string;
  issuedCode?: string;
}): boolean {
  if (!input.hasIndividualCodes) return false;
  if (input.universalCode?.trim()) return false;
  if (input.issuedCode?.trim()) return false;
  return true;
}
