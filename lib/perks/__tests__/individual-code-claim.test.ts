import { describe, expect, it } from 'vitest';
import { shouldIssueIndividualDiscountCode } from '../individual-code-claim';

describe('shouldIssueIndividualDiscountCode', () => {
  it('issues a code when the reward uses individual codes and none is assigned yet', () => {
    expect(
      shouldIssueIndividualDiscountCode({ hasIndividualCodes: true })
    ).toBe(true);
  });

  it('skips redeem when a universal code is already public', () => {
    expect(
      shouldIssueIndividualDiscountCode({
        hasIndividualCodes: false,
        universalCode: 'SAVE10',
      })
    ).toBe(false);
  });

  it('skips redeem once this member already has a code', () => {
    expect(
      shouldIssueIndividualDiscountCode({
        hasIndividualCodes: true,
        issuedCode: 'FUSER-23',
      })
    ).toBe(false);
  });
});
