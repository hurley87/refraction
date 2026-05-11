import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockListSpendExperiences = vi.fn();
const mockCreateSpendExperience = vi.fn();
const mockGetSpendExperienceByCreateIdempotencyKey = vi.fn();
const mockCreateSpendPrivyServerWallet = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/spend-experiences', () => ({
  listSpendExperiences: (...args: unknown[]) =>
    mockListSpendExperiences(...args),
  createSpendExperience: (...args: unknown[]) =>
    mockCreateSpendExperience(...args),
  getSpendExperienceByCreateIdempotencyKey: (...args: unknown[]) =>
    mockGetSpendExperienceByCreateIdempotencyKey(...args),
}));

vi.mock('@/lib/api/privy', () => ({
  createSpendPrivyServerWallet: (...args: unknown[]) =>
    mockCreateSpendPrivyServerWallet(...args),
}));

import { GET, POST } from '../route';

function jsonRequest(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  emailHeader?: string
): NextRequest {
  const headers = new Headers();
  if (emailHeader) headers.set('x-user-email', emailHeader);
  if (body) headers.set('Content-Type', 'application/json');
  return new NextRequest('http://localhost:3000/api/admin/spend-experiences', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/admin/spend-experiences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await GET(jsonRequest('GET', undefined, 'user@example.com'));
    const j = await res.json();
    expect(res.status).toBe(403);
    expect(j.success).toBe(false);
    expect(mockListSpendExperiences).not.toHaveBeenCalled();
  });

  it('returns list for admin', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockListSpendExperiences.mockResolvedValue([
      {
        id: 'uuid-1',
        title: 'Test',
        description: null,
        event_id: null,
        status: 'draft',
        spend_rail: 'base_usdc',
        points_to_usdc_rate: 1000,
        max_usdc_per_user: 5,
        treasury_wallet_address: '0x1111111111111111111111111111111111111111',
        receiving_wallet_address: '0x2222222222222222222222222222222222222222',
        start_time: '2026-05-01T00:00:00Z',
        end_time: '2026-05-02T00:00:00Z',
        created_by: 'admin@example.com',
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ]);

    const res = await GET(jsonRequest('GET', undefined, 'admin@example.com'));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.success).toBe(true);
    expect(j.data.spendExperiences).toHaveLength(1);
  });
});

describe('POST /api/admin/spend-experiences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSpendExperienceByCreateIdempotencyKey.mockResolvedValue(null);
    mockCreateSpendPrivyServerWallet.mockResolvedValue({
      privy_server_wallet_id: 'wallet-1',
      server_wallet_address: '0x9999999999999999999999999999999999999999',
      server_wallet_chain: 'base-mainnet',
      server_wallet_created_at: '2026-04-28T00:00:00.000Z',
    });
  });

  it('returns 400 on validation failure', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });

    const res = await POST(
      jsonRequest(
        'POST',
        {
          title: '',
          points_to_usdc_rate: 1000,
          max_usdc_per_user: 5,
          start_time: '2026-05-01T12:00:00.000Z',
          end_time: '2026-05-08T12:00:00.000Z',
        },
        'admin@example.com'
      )
    );
    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j.success).toBe(false);
    expect(mockCreateSpendExperience).not.toHaveBeenCalled();
  });

  it('returns 403 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await POST(
      jsonRequest(
        'POST',
        {
          title: 'Ok',
          points_to_usdc_rate: 1000,
          max_usdc_per_user: 5,
          start_time: '2026-05-01T12:00:00.000Z',
          end_time: '2026-05-08T12:00:00.000Z',
        },
        'x@y.com'
      )
    );
    expect(res.status).toBe(403);
    expect(mockCreateSpendExperience).not.toHaveBeenCalled();
  });

  it('creates a Privy server wallet before inserting the spend experience', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockCreateSpendExperience.mockImplementation(async (input) => ({
      id: 'exp-1',
      title: input.title,
      description: input.description,
      event_id: input.event_id,
      status: input.status,
      spend_rail: input.spend_rail,
      points_to_usdc_rate: input.points_to_usdc_rate,
      max_usdc_per_user: input.max_usdc_per_user,
      treasury_wallet_address: input.server_wallet_address,
      receiving_wallet_address: input.server_wallet_address,
      privy_server_wallet_id: input.privy_server_wallet_id,
      server_wallet_address: input.server_wallet_address,
      server_wallet_chain: input.server_wallet_chain,
      server_wallet_created_at: input.server_wallet_created_at,
      spend_create_idempotency_key: input.spend_create_idempotency_key,
      start_time: input.start_time,
      end_time: input.end_time,
      created_by: input.created_by,
      created_at: '2026-04-28T00:00:00.000Z',
      updated_at: '2026-04-28T00:00:00.000Z',
    }));

    const res = await POST(
      jsonRequest(
        'POST',
        {
          title: 'Ok',
          points_to_usdc_rate: 1000,
          max_usdc_per_user: 5,
          status: 'active',
          start_time: '2026-05-01T12:00:00.000Z',
          end_time: '2026-05-08T12:00:00.000Z',
        },
        'admin@example.com'
      )
    );
    const j = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreateSpendPrivyServerWallet).toHaveBeenCalledOnce();
    expect(mockCreateSpendExperience).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
        spend_rail: 'base_usdc',
        privy_server_wallet_id: 'wallet-1',
        server_wallet_address: '0x9999999999999999999999999999999999999999',
      })
    );
    expect(j.data.funding.serverWalletAddress).toBe(
      '0x9999999999999999999999999999999999999999'
    );
  });

  it('passes spend_rail stellar_usdc through to createSpendExperience', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockCreateSpendExperience.mockImplementation(async (input) => ({
      id: 'exp-1',
      title: input.title,
      description: input.description,
      event_id: input.event_id,
      status: input.status,
      spend_rail: input.spend_rail,
      points_to_usdc_rate: input.points_to_usdc_rate,
      max_usdc_per_user: input.max_usdc_per_user,
      treasury_wallet_address: input.server_wallet_address,
      receiving_wallet_address: input.server_wallet_address,
      privy_server_wallet_id: input.privy_server_wallet_id,
      server_wallet_address: input.server_wallet_address,
      server_wallet_chain: input.server_wallet_chain,
      server_wallet_created_at: input.server_wallet_created_at,
      spend_create_idempotency_key: input.spend_create_idempotency_key,
      start_time: input.start_time,
      end_time: input.end_time,
      created_by: input.created_by,
      created_at: '2026-04-28T00:00:00.000Z',
      updated_at: '2026-04-28T00:00:00.000Z',
    }));

    const res = await POST(
      jsonRequest(
        'POST',
        {
          title: 'Stellar pilot',
          points_to_usdc_rate: 1000,
          max_usdc_per_user: 5,
          spend_rail: 'stellar_usdc',
          start_time: '2026-05-01T12:00:00.000Z',
          end_time: '2026-05-08T12:00:00.000Z',
        },
        'admin@example.com'
      )
    );

    expect(res.status).toBe(200);
    expect(mockCreateSpendExperience).toHaveBeenCalledWith(
      expect.objectContaining({ spend_rail: 'stellar_usdc' })
    );
  });

  it('returns existing experience for repeated idempotency key', async () => {
    mockRequireAdmin.mockResolvedValue({
      isValid: true,
      user: { email: 'admin@example.com' },
    });
    mockGetSpendExperienceByCreateIdempotencyKey.mockResolvedValue({
      id: 'exp-existing',
      title: 'Existing',
      description: null,
      event_id: null,
      status: 'draft',
      spend_rail: 'base_usdc',
      points_to_usdc_rate: 1000,
      max_usdc_per_user: 5,
      treasury_wallet_address: '0x9999999999999999999999999999999999999999',
      receiving_wallet_address: '0x9999999999999999999999999999999999999999',
      privy_server_wallet_id: 'wallet-1',
      server_wallet_address: '0x9999999999999999999999999999999999999999',
      server_wallet_chain: 'base-mainnet',
      server_wallet_created_at: '2026-04-28T00:00:00.000Z',
      spend_create_idempotency_key: 'idem-1',
      start_time: '2026-05-01T12:00:00.000Z',
      end_time: '2026-05-08T12:00:00.000Z',
      created_by: 'admin@example.com',
      created_at: '2026-04-28T00:00:00.000Z',
      updated_at: '2026-04-28T00:00:00.000Z',
    });

    const req = jsonRequest(
      'POST',
      {
        title: 'Ok',
        points_to_usdc_rate: 1000,
        max_usdc_per_user: 5,
        start_time: '2026-05-01T12:00:00.000Z',
        end_time: '2026-05-08T12:00:00.000Z',
      },
      'admin@example.com'
    );
    req.headers.set('Idempotency-Key', 'idem-1');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockCreateSpendPrivyServerWallet).not.toHaveBeenCalled();
    expect(mockCreateSpendExperience).not.toHaveBeenCalled();
  });
});
