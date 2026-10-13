import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapWelcomeTour } from './map-welcome-tour';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} />
  ),
}));

function installMatchMedia(mobile: boolean, standalone = false) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('display-mode')
      ? standalone
      : query.includes('max-width')
        ? mobile
        : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

async function advanceToLastSharedSlide(
  user: ReturnType<typeof userEvent.setup>
) {
  for (let step = 0; step < 3; step += 1) {
    await user.click(screen.getByRole('button', { name: 'Continue tour' }));
  }
}

describe('MapWelcomeTour page 4', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows Get Started and Add to Home Screen after page 3 on a phone', async () => {
    installMatchMedia(true);
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<MapWelcomeTour open onComplete={onComplete} />);

    await advanceToLastSharedSlide(user);

    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('STARTED')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add to home screen/i })
    ).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('finishes on page 3 above the phone breakpoint', async () => {
    installMatchMedia(false);
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<MapWelcomeTour open onComplete={onComplete} />);

    await advanceToLastSharedSlide(user);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: /add to home screen/i })
    ).not.toBeInTheDocument();
  });

  it('calls the browser install prompt when one is available', async () => {
    installMatchMedia(true);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<MapWelcomeTour open onComplete={onComplete} />);

    await advanceToLastSharedSlide(user);

    const installEvent = new Event('beforeinstallprompt', {
      cancelable: true,
    });
    Object.assign(installEvent, { prompt });
    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    await user.click(
      screen.getByRole('button', { name: /add to home screen/i })
    );

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows Safari steps on iPhone when no install prompt exists', async () => {
    installMatchMedia(true);
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      maxTouchPoints: 5,
      platform: 'iPhone',
    });
    const user = userEvent.setup();
    render(<MapWelcomeTour open onComplete={vi.fn()} />);

    await advanceToLastSharedSlide(user);
    await user.click(
      screen.getByRole('button', { name: /add to home screen/i })
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Tap the Share button in Safari, then tap Add to Home Screen.'
    );
  });

  it('hides Add to Home Screen when the app is already installed', async () => {
    installMatchMedia(true, true);
    const user = userEvent.setup();
    render(<MapWelcomeTour open onComplete={vi.fn()} />);

    await advanceToLastSharedSlide(user);

    expect(
      screen.queryByRole('button', { name: /add to home screen/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start now/i })
    ).toBeInTheDocument();
  });
});
