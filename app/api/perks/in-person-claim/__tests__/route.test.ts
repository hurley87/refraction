import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn(),
}));

vi.mock('@/lib/db/perks', () => ({
  getPerkById: vi.fn(),
}));

vi.mock('@/lib/db/perk-in-person-claims', () => ({
  countInPersonClaimsToday: vi.fn(),
  isClaimedToday: vi.fn(),
  recordInPersonClaim: vi.fn(),
}));

import { getPlayerByWallet } from '@/lib/db/players';
import { getPerkById } from '@/lib/db/perks';
import {
  countInPersonClaimsToday,
  isClaimedToday,
  recordInPersonClaim,
} from '@/lib/db/perk-in-person-claims';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';
const PERK_ID = '11111111-1111-1111-1111-111111111111';

function createPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/perks/in-person-claim', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/perks/in-person-claim');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { method: 'GET' });
}

describe('In-person perk claim API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('records a claim when under the daily cap', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce({
        id: 1,
        wallet_address: WALLET,
        total_points: 5000,
      });
      vi.mocked(getPerkById).mockResolvedValueOnce({
        id: PERK_ID,
        title: 'Welcome Drink',
        description: 'Free drink',
        points_threshold: 100,
        type: 'bar',
        website_url: '',
        is_active: true,
        max_claims_per_member_per_day: 1,
        location: 'Dear Eleanor',
      });
      vi.mocked(countInPersonClaimsToday).mockResolvedValueOnce(0);
      vi.mocked(isClaimedToday).mockReturnValueOnce(false);
      vi.mocked(recordInPersonClaim).mockResolvedValueOnce({
        id: 'claim-1',
        perk_id: PERK_ID,
        user_wallet_address: WALLET,
        claimed_at: new Date().toISOString(),
      });

      const response = await POST(
        createPostRequest({ perkId: PERK_ID, walletAddress: WALLET })
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.claim_count_today).toBe(1);
      expect(recordInPersonClaim).toHaveBeenCalledWith(WALLET, PERK_ID);
    });

    it('rejects when the daily cap is already hit', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce({
        id: 1,
        wallet_address: WALLET,
        total_points: 5000,
      });
      vi.mocked(getPerkById).mockResolvedValueOnce({
        id: PERK_ID,
        title: 'Welcome Drink',
        description: 'Free drink',
        points_threshold: 100,
        type: 'bar',
        website_url: null,
        is_active: true,
        max_claims_per_member_per_day: 1,
      });
      vi.mocked(countInPersonClaimsToday).mockResolvedValueOnce(1);
      vi.mocked(isClaimedToday).mockReturnValueOnce(true);

      const response = await POST(
        createPostRequest({ perkId: PERK_ID, walletAddress: WALLET })
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('CLAIMED TODAY');
      expect(recordInPersonClaim).not.toHaveBeenCalled();
    });

    it('rejects online perks that have a website URL', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce({
        id: 1,
        wallet_address: WALLET,
        total_points: 5000,
      });
      vi.mocked(getPerkById).mockResolvedValueOnce({
        id: PERK_ID,
        title: 'Online perk',
        description: 'Link claim',
        points_threshold: 100,
        type: 'online',
        website_url: 'https://example.com/claim',
        is_active: true,
        max_claims_per_member_per_day: null,
      });

      const response = await POST(
        createPostRequest({ perkId: PERK_ID, walletAddress: WALLET })
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toMatch(/online/i);
      expect(recordInPersonClaim).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('returns claimed_today status', async () => {
      vi.mocked(getPlayerByWallet).mockResolvedValueOnce({
        id: 1,
        wallet_address: WALLET,
        total_points: 5000,
      });
      vi.mocked(getPerkById).mockResolvedValueOnce({
        id: PERK_ID,
        title: 'Welcome Drink',
        description: 'Free drink',
        points_threshold: 100,
        type: 'bar',
        website_url: '',
        is_active: true,
        max_claims_per_member_per_day: 1,
      });
      vi.mocked(countInPersonClaimsToday).mockResolvedValueOnce(1);
      vi.mocked(isClaimedToday).mockReturnValueOnce(true);

      const response = await GET(
        createGetRequest({ perkId: PERK_ID, walletAddress: WALLET })
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.claimed_today).toBe(true);
      expect(json.data.claim_count_today).toBe(1);
    });
  });
});
