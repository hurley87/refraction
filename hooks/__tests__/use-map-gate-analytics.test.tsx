import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapGateAnalytics } from '@/hooks/use-map-gate-analytics';

const mockTrackEvent = vi.fn();
const mockMarkSignupFromGate = vi.fn();
let emailStatus: 'initial' | 'sending-code' | 'awaiting-code-input' | 'error' =
  'initial';
let loginOnComplete:
  | ((params: { wasAlreadyAuthenticated: boolean }) => void)
  | undefined;

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
}));

vi.mock('@/lib/analytics/attribution', () => ({
  markSignupFromGate: (...args: unknown[]) => mockMarkSignupFromGate(...args),
}));

vi.mock('@privy-io/react-auth', () => ({
  useLoginWithEmail: () => ({ state: { status: emailStatus } }),
  useLogin: (callbacks?: {
    onComplete?: (params: { wasAlreadyAuthenticated: boolean }) => void;
  }) => {
    loginOnComplete = callbacks?.onComplete;
    return { login: vi.fn() };
  },
}));

describe('useMapGateAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    emailStatus = 'initial';
    loginOnComplete = undefined;
  });

  it('fires gate_viewed once per session when the login modal is visible', () => {
    const { rerender } = renderHook(
      (props: {
        ready: boolean;
        authenticated: boolean;
        isPrivyModalOpen: boolean;
      }) => useMapGateAnalytics(props),
      {
        initialProps: {
          ready: true,
          authenticated: false,
          isPrivyModalOpen: true,
        },
      }
    );

    expect(mockTrackEvent).toHaveBeenCalledWith('gate_viewed', {
      surface: 'map',
    });

    mockTrackEvent.mockClear();
    rerender({
      ready: true,
      authenticated: false,
      isPrivyModalOpen: false,
    });
    rerender({
      ready: true,
      authenticated: false,
      isPrivyModalOpen: true,
    });

    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'gate_viewed',
      expect.anything()
    );
  });

  it('does not fire gate_viewed for signed-in visitors', () => {
    renderHook(() =>
      useMapGateAnalytics({
        ready: true,
        authenticated: true,
        isPrivyModalOpen: true,
      })
    );
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('fires gate_signup_clicked when email login starts', () => {
    emailStatus = 'initial';
    const { rerender } = renderHook(
      (props: { emailReady: boolean }) =>
        useMapGateAnalytics({
          ready: true,
          authenticated: false,
          isPrivyModalOpen: true,
        }),
      { initialProps: { emailReady: false } }
    );

    emailStatus = 'sending-code';
    rerender({ emailReady: true });

    expect(mockTrackEvent).toHaveBeenCalledWith('gate_signup_clicked', {
      surface: 'map',
    });
    expect(mockMarkSignupFromGate).toHaveBeenCalledWith({ surface: 'map' });
  });

  it('fires gate_signup_clicked once when login completes as a new session', () => {
    renderHook(() =>
      useMapGateAnalytics({
        ready: true,
        authenticated: false,
        isPrivyModalOpen: true,
      })
    );

    act(() => {
      loginOnComplete?.({ wasAlreadyAuthenticated: false });
    });
    act(() => {
      loginOnComplete?.({ wasAlreadyAuthenticated: false });
    });

    expect(
      mockTrackEvent.mock.calls.filter(
        ([name]) => name === 'gate_signup_clicked'
      )
    ).toHaveLength(1);
  });
});
