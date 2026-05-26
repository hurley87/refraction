type SponsoredActivationDescriptionRead = {
  activation: {
    description: string | null;
    sponsor_name: string;
  };
  rewardItem: {
    description: string | null;
  };
};

/**
 * Public landing copy: prefer activation description, then reward item
 * description, then sponsor name (always non-empty for valid reads).
 */
export function resolveSponsoredActivationDescription(
  read: SponsoredActivationDescriptionRead
): string {
  const { activation, rewardItem } = read;
  return (
    activation.description?.trim() ||
    rewardItem.description?.trim() ||
    activation.sponsor_name
  );
}
