import { describe, expect, it, vi } from 'vitest';

describe('toast wrapper', () => {
  it('does not throw when the sonner export is null', async () => {
    vi.resetModules();
    vi.doMock('sonner', () => ({ toast: null }));
    const { toast } = await import('@/lib/ui/toast');
    expect(() => toast.info('hello')).not.toThrow();
    expect(() => toast.error('oops')).not.toThrow();
  });
});
