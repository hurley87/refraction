import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPromote = vi.fn();
const mockListBase = vi.fn();
const mockListStellar = vi.fn();
const mockListTempo = vi.fn();
const mockRunBase = vi.fn();
const mockRunStellar = vi.fn();
const mockRunTempo = vi.fn();

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  getSponsoredSettlementBatchSize: () => 10,
  listBaseActivationSettlementsForWorker: (...a: unknown[]) =>
    mockListBase(...a),
  listStellarActivationSettlementsForWorker: (...a: unknown[]) =>
    mockListStellar(...a),
  listTempoActivationSettlementsForWorker: (...a: unknown[]) =>
    mockListTempo(...a),
  promoteActivationSettlementRetryingToQueued: (...a: unknown[]) =>
    mockPromote(...a),
}));

vi.mock('@/lib/activation/base-settlement-worker', () => ({
  runBaseSettlementWorkerBatch: (...a: unknown[]) => mockRunBase(...a),
}));

vi.mock('@/lib/activation/settlement-worker-stellar', () => ({
  runStellarSettlementWorkerBatch: (...a: unknown[]) => mockRunStellar(...a),
}));

vi.mock('@/lib/activation/tempo-settlement-worker', () => ({
  runTempoSettlementWorkerBatch: (...a: unknown[]) => mockRunTempo(...a),
}));

import { runSponsoredSettlementCronOrchestrated } from '@/lib/activation/settlement-orchestration';

describe('runSponsoredSettlementCronOrchestrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPromote.mockResolvedValue(2);
    mockListBase.mockResolvedValue([{ id: 'b1' }]);
    mockListStellar.mockResolvedValue([{ id: 's1' }]);
    mockListTempo.mockResolvedValue([{ id: 't1' }]);
    mockRunBase.mockResolvedValue({
      processed: 1,
      confirmed: 1,
      failed: 0,
      skipped: 0,
      scheduledRetry: 0,
    });
    mockRunStellar.mockResolvedValue({
      processed: 1,
      confirmed: 0,
      failed: 0,
      skipped: 1,
      scheduledRetry: 0,
    });
    mockRunTempo.mockResolvedValue({
      processed: 1,
      confirmed: 1,
      failed: 0,
      skipped: 0,
      scheduledRetry: 0,
    });
  });

  it('promotes retrying rows then runs Base, Stellar, and Tempo batches', async () => {
    const r = await runSponsoredSettlementCronOrchestrated();
    expect(mockPromote).toHaveBeenCalledTimes(1);
    expect(mockListBase).toHaveBeenCalledWith(10);
    expect(mockListStellar).toHaveBeenCalledWith(10);
    expect(mockListTempo).toHaveBeenCalledWith(10);
    expect(mockRunBase).toHaveBeenCalledWith([{ id: 'b1' }]);
    expect(mockRunStellar).toHaveBeenCalledWith([{ id: 's1' }]);
    expect(mockRunTempo).toHaveBeenCalledWith([{ id: 't1' }]);
    expect(r.promotedRetryingToQueued).toBe(2);
    expect(r.candidateSettlements).toEqual({ base: 1, stellar: 1, tempo: 1 });
  });
});
