import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllRowsInPages } from '../analytics';

describe('fetchAllRowsInPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a single page when under the max row cap', async () => {
    const runPage = vi.fn().mockResolvedValueOnce({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    });

    const rows = await fetchAllRowsInPages(runPage);

    expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    expect(runPage).toHaveBeenCalledTimes(1);
    expect(runPage).toHaveBeenCalledWith(0, 999);
  });

  it('fetches subsequent pages until a short page is returned', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const page2 = [{ id: 1000 }];

    const runPage = vi
      .fn()
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null });

    const rows = await fetchAllRowsInPages(runPage);

    expect(rows).toHaveLength(1001);
    expect(runPage).toHaveBeenCalledTimes(2);
    expect(runPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(runPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('propagates errors from the underlying query', async () => {
    const runPage = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'query failed' },
    });

    await expect(fetchAllRowsInPages(runPage)).rejects.toEqual({
      message: 'query failed',
    });
  });
});
