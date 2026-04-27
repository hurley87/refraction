import type { SpendExperience, SpendExperienceStatus } from '@/lib/types';

export type ExperienceGateResult =
  | { ok: true }
  | { ok: false; error: string; httpStatus: 400 | 404 };

const ACTIVE: SpendExperienceStatus = 'active';

/**
 * Returns whether a spend experience accepts new scan/session creation
 * (status active and current time within [start_time, end_time]).
 */
export function assertSpendExperienceOpenForSessions(
  experience: SpendExperience | null,
  now: Date = new Date()
): ExperienceGateResult {
  if (!experience) {
    return { ok: false, error: 'Spend experience not found', httpStatus: 404 };
  }
  if (experience.status !== ACTIVE) {
    return {
      ok: false,
      error: 'Spend experience is not active',
      httpStatus: 400,
    };
  }
  const start = new Date(experience.start_time);
  const end = new Date(experience.end_time);
  if (now < start) {
    return {
      ok: false,
      error: 'Spend experience has not started yet',
      httpStatus: 400,
    };
  }
  if (now > end) {
    return {
      ok: false,
      error: 'Spend experience has ended or expired',
      httpStatus: 400,
    };
  }
  return { ok: true };
}

/**
 * Expiry for a new session: min(experience end, now + 24h).
 */
export function computeSpendSessionExpiresAt(
  experience: SpendExperience,
  now: Date = new Date()
): Date {
  const end = new Date(experience.end_time);
  const dayCap = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return end < dayCap ? end : dayCap;
}
