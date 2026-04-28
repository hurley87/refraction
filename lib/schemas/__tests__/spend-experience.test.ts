import { describe, it, expect } from 'vitest';
import {
  createSpendExperienceRequestSchema,
  updateSpendExperienceRequestSchema,
} from '../spend-experience';

const validBase = {
  title: 'Pilot',
  description: null,
  event_id: null,
  status: 'draft' as const,
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  start_time: '2026-05-01T12:00:00.000Z',
  end_time: '2026-05-08T12:00:00.000Z',
};

describe('createSpendExperienceRequestSchema', () => {
  it('accepts valid payload', () => {
    const r = createSpendExperienceRequestSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it('does not accept admin-managed wallet addresses', () => {
    const r = createSpendExperienceRequestSchema.safeParse({
      ...validBase,
      treasury_wallet_address: '0x1111111111111111111111111111111111111111',
    });
    expect(r.success).toBe(false);
  });

  it('rejects end before start', () => {
    const r = createSpendExperienceRequestSchema.safeParse({
      ...validBase,
      start_time: '2026-05-08T12:00:00.000Z',
      end_time: '2026-05-01T12:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });
});

describe('updateSpendExperienceRequestSchema', () => {
  it('rejects empty patch', () => {
    const r = updateSpendExperienceRequestSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('accepts partial update', () => {
    const r = updateSpendExperienceRequestSchema.safeParse({ title: 'x' });
    expect(r.success).toBe(true);
  });
});
