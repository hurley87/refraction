import { getSpendExperienceById } from '@/lib/db/spend-experiences';
import { getSpendSessionById } from '@/lib/db/spend-sessions';
import { computeConversionAmounts } from '@/lib/spend-conversion-preview';
import type { SpendPilotApiHttpStatus } from '@/lib/spend-pilot-http-status';
import type { SpendExperience, SpendSession } from '@/lib/types';

export async function getSpendPaymentSessionContextOr404(
  sessionId: string
): Promise<
  | {
      session: SpendSession;
      spendExperience: SpendExperience;
      usdcAmount: number;
    }
  | { error: string; httpStatus: SpendPilotApiHttpStatus }
> {
  const session = await getSpendSessionById(sessionId);
  if (!session) {
    return { error: 'Spend session not found', httpStatus: 404 };
  }
  const spendExperience = await getSpendExperienceById(
    session.spend_experience_id
  );
  if (!spendExperience) {
    return { error: 'Spend experience not found', httpStatus: 404 };
  }
  const { usdcAmount } = computeConversionAmounts(spendExperience);
  return { session, spendExperience, usdcAmount };
}
