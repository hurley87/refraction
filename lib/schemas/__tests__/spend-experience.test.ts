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
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  start_time: '2026-05-01T12:00:00.000Z',
  end_time: '2026-05-08T12:00:00.000Z',
};

describe('createSpendExperienceRequestSchema', () => {
  it('accepts valid payload', () => {
    const r = createSpendExperienceRequestSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it('rejects invalid treasury address', () => {
    const r = createSpendExperienceRequestSchema.safeParse({
      ...validBase,
      treasury_wallet_address: 'not-an-address',
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
