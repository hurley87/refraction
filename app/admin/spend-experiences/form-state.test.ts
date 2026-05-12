import { describe, expect, it } from 'vitest';
import {
  emptySpendExperienceForm,
  experienceToForm,
  SPEND_RAIL_ADMIN_LABEL,
} from './form-state';
import type { SpendExperience } from '@/lib/types';

describe('spend experience form state', () => {
  it('defaults spend_rail to base_usdc for new forms', () => {
    const f = emptySpendExperienceForm();
    expect(f.spend_rail).toBe('base_usdc');
  });

  it('maps spend_rail from an experience', () => {
    const e = {
      id: 'x',
      title: 'T',
      description: null,
      event_id: null,
      status: 'draft' as const,
      spend_rail: 'stellar_usdc' as const,
      points_to_usdc_rate: 1000,
      max_usdc_per_user: 5,
      treasury_wallet_address: 'G' + 'A'.repeat(55),
      receiving_wallet_address: 'G' + 'B'.repeat(55),
      privy_server_wallet_id: null,
      server_wallet_address: null,
      server_wallet_chain: null,
      server_wallet_created_at: null,
      spend_create_idempotency_key: null,
      start_time: '2026-05-01T12:00:00.000Z',
      end_time: '2026-05-08T12:00:00.000Z',
      created_by: null,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    } satisfies SpendExperience;
    expect(experienceToForm(e).spend_rail).toBe('stellar_usdc');
  });

  it('uses aligned admin labels', () => {
    expect(SPEND_RAIL_ADMIN_LABEL.base_usdc).toBe('Base USDC');
    expect(SPEND_RAIL_ADMIN_LABEL.stellar_usdc).toBe('Stellar USDC');
  });
});
