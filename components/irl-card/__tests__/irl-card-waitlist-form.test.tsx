import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import {
  IRL_CARD_WAITLIST_COPY as COPY,
  IRL_CARD_WAITLIST_PENDING_COPY as PENDING,
} from '@/lib/irl-card/waitlist-copy';

const mocks = vi.hoisted(() => ({
  usePrivy: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mocks.usePrivy(),
}));
vi.mock('@/components/shared/analytics-provider', () => ({
  useAnalytics: () => ({ trackEvent: mocks.trackEvent }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  const SelectContext = React.createContext<{
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
    items: ReactNode;
  }>({ items: null });

  function Select({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
    children: ReactNode;
  }) {
    const childArray = React.Children.toArray(children) as React.ReactElement[];
    const content = childArray.find((c) => c.type === SelectContent);
    const trigger = childArray.find((c) => c.type === SelectTrigger);
    return (
      <SelectContext.Provider
        value={{
          value,
          onValueChange,
          disabled,
          items: content?.props.children,
        }}
      >
        {trigger}
      </SelectContext.Provider>
    );
  }
  const SelectTrigger = React.forwardRef<
    HTMLSelectElement,
    { id?: string; children?: ReactNode; className?: string } & Record<
      string,
      unknown
    >
  >(function SelectTrigger(props, ref) {
    const ctx = React.useContext(SelectContext);
    return (
      <select
        ref={ref}
        id={props.id as string | undefined}
        aria-invalid={props['aria-invalid'] as boolean | undefined}
        aria-describedby={props['aria-describedby'] as string | undefined}
        disabled={ctx.disabled}
        value={ctx.value ?? ''}
        onChange={(e) => ctx.onValueChange?.(e.target.value)}
      >
        <option value="">--</option>
        {ctx.items}
      </select>
    );
  });
  function SelectContent({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }
  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: ReactNode;
  }) {
    return <option value={value}>{children}</option>;
  }
  function SelectValue() {
    return null;
  }
  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

import { IrlCardWaitlistForm } from '@/components/irl-card/irl-card-waitlist-form';

const COUNTRY_ID = '11111111-1111-4111-8111-111111111111';
const countries = [{ id: COUNTRY_ID, iso2: 'CA', name: 'Canada' }];
const suggestions = [
  {
    mapboxId: 'tor',
    name: 'Toronto',
    region: 'Ontario',
    placeFormatted: 'Ontario, Canada',
  },
  {
    mapboxId: 'ott',
    name: 'Ottawa',
    region: 'Ontario',
    placeFormatted: 'Ontario, Canada',
  },
];

type FetchHandler = (
  url: string,
  init?: RequestInit
) => Response | Promise<Response>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let postHandler: FetchHandler;
let prefillHandler: FetchHandler;
const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/api/countries')) {
      return jsonResponse({ success: true, data: { countries } });
    }
    if (url.startsWith('/api/geo/cities/suggest')) {
      return jsonResponse({ success: true, data: { suggestions } });
    }
    if (url === '/api/irl-card/waitlist' && init?.method === 'POST') {
      return postHandler(url, init);
    }
    if (url === '/api/irl-card/waitlist') {
      return prefillHandler(url, init);
    }
    throw new Error(`Unexpected fetch ${url}`);
  }
);

function postBody() {
  const call = fetchMock.mock.calls.find(
    ([, init]) => (init as RequestInit | undefined)?.method === 'POST'
  );
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

async function renderForm() {
  render(<IrlCardWaitlistForm />);
  await waitFor(() =>
    expect(screen.getByLabelText(COPY.countryLabel)).not.toBeDisabled()
  );
}

async function pickCity(name = 'Toronto') {
  const city = screen.getByLabelText(COPY.cityLabel);
  fireEvent.change(city, { target: { value: name.slice(0, 3) } });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300));
  });
  await screen.findByRole('option', { name: new RegExp(name) });
  fireEvent.mouseDown(screen.getByRole('option', { name: new RegExp(name) }));
}

async function fillValidForm() {
  fireEvent.change(screen.getByLabelText(COPY.emailLabel), {
    target: { value: 'fan@example.com' },
  });
  fireEvent.change(screen.getByLabelText(COPY.countryLabel), {
    target: { value: COUNTRY_ID },
  });
  await pickCity();
  fireEvent.click(screen.getByLabelText(COPY.no));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  mocks.usePrivy.mockReturnValue({
    ready: true,
    authenticated: false,
    getAccessToken: vi.fn().mockResolvedValue(null),
  });
  postHandler = () =>
    jsonResponse({
      success: true,
      data: { joined: true, alreadyJoined: false, countryIso2: 'CA' },
    });
  prefillHandler = () => jsonResponse({ success: false }, 401);
  window.history.replaceState(
    {},
    '',
    '/irl-card/waitlist?utm_source=venue-qr&utm_medium=qr&source=venue&source_ref=loc_1'
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IrlCardWaitlistForm', () => {
  it('renders the approved copy and tracks one view', async () => {
    await renderForm();

    expect(screen.getByLabelText(COPY.emailLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.cityLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.countryLabel)).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: COPY.alreadyUsesIrlLabel })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.yes)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.no)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: COPY.submit })
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.availabilityNote)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    const viewCalls = mocks.trackEvent.mock.calls.filter(
      ([name]) => name === ANALYTICS_EVENTS.IRL_CARD_WAITLIST_VIEWED
    );
    expect(viewCalls).toHaveLength(1);
  });

  it('shows required errors, focuses the first invalid field and does not submit', async () => {
    await renderForm();

    fireEvent.click(screen.getByRole('button', { name: COPY.submit }));

    const email = screen.getByLabelText(COPY.emailLabel);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    expect(screen.getAllByText(PENDING.emailRequired).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText(PENDING.countryRequired).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText(PENDING.cityRequired).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(PENDING.alreadyUsesIrlRequired).length
    ).toBeGreaterThan(0);
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit)?.method === 'POST'
      )
    ).toBe(false);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.IRL_CARD_WAITLIST_FAILED,
      {
        reason: 'validation',
        fields: ['email', 'country', 'city', 'alreadyUsesIrl'],
      }
    );
  });

  it('shows success only after the API confirms, with attribution and no PII in analytics', async () => {
    let resolvePost: (r: Response) => void = () => {};
    postHandler = () => new Promise<Response>((r) => (resolvePost = r));
    await renderForm();
    await fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: COPY.submit }));
    expect(
      await screen.findByRole('button', { name: PENDING.submitting })
    ).toBeDisabled();
    expect(screen.queryByText(COPY.success)).not.toBeInTheDocument();

    await act(async () => {
      resolvePost(
        jsonResponse({
          success: true,
          data: { joined: true, alreadyJoined: false, countryIso2: 'CA' },
        })
      );
    });

    expect(await screen.findByText(COPY.success)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveFocus();

    expect(postBody()).toMatchObject({
      email: 'fan@example.com',
      countryId: COUNTRY_ID,
      city: { mapboxId: 'tor', name: 'Toronto', region: 'Ontario' },
      alreadyUsesIrl: false,
      marketingConsent: false,
      attribution: {
        utm_source: 'venue-qr',
        utm_medium: 'qr',
        source: 'venue',
        source_ref: 'loc_1',
      },
    });

    const joined = mocks.trackEvent.mock.calls.find(
      ([name]) => name === ANALYTICS_EVENTS.IRL_CARD_WAITLIST_JOINED
    );
    expect(joined?.[1]).toMatchObject({
      already_joined: false,
      already_uses_irl: false,
      country_iso2: 'CA',
      utm_source: 'venue-qr',
      source_ref: 'loc_1',
    });
    const serialized = JSON.stringify(mocks.trackEvent.mock.calls);
    expect(serialized).not.toContain('fan@example.com');
    expect(serialized).not.toContain('Toronto');
  });

  it('keeps entered values and shows an error when the API fails', async () => {
    postHandler = () => jsonResponse({ success: false, error: 'x' }, 500);
    await renderForm();
    await fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: COPY.submit }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      PENDING.submitFailed
    );
    expect(screen.queryByText(COPY.success)).not.toBeInTheDocument();
    expect(screen.getByLabelText(COPY.emailLabel)).toHaveValue(
      'fan@example.com'
    );
    expect(screen.getByLabelText(COPY.cityLabel)).toHaveValue('Toronto');
    expect(screen.getByLabelText(COPY.no)).toBeChecked();
    expect(
      screen.getByRole('button', { name: COPY.submit })
    ).not.toBeDisabled();
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.IRL_CARD_WAITLIST_FAILED,
      { reason: 'server', status: 500 }
    );
  });

  it('prefills signed-in members and sends their token', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('privy-token');
    mocks.usePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      getAccessToken,
    });
    prefillHandler = () =>
      jsonResponse({
        success: true,
        data: {
          isMember: true,
          email: 'member@example.com',
          countryId: COUNTRY_ID,
          city: { mapboxId: 'tor', name: 'Toronto', region: 'Ontario' },
          alreadyJoined: false,
        },
      });

    await renderForm();

    await waitFor(() =>
      expect(screen.getByLabelText(COPY.emailLabel)).toHaveValue(
        'member@example.com'
      )
    );
    expect(screen.getByLabelText(COPY.countryLabel)).toHaveValue(COUNTRY_ID);
    expect(screen.getByLabelText(COPY.cityLabel)).toHaveValue('Toronto');
    expect(screen.getByLabelText(COPY.yes)).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: COPY.submit }));
    await screen.findByText(COPY.success);

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST'
    );
    expect((postCall?.[1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer privy-token',
    });
  });

  it('supports keyboard selection in the city combobox', async () => {
    await renderForm();
    fireEvent.change(screen.getByLabelText(COPY.countryLabel), {
      target: { value: COUNTRY_ID },
    });

    const city = screen.getByRole('combobox', { name: COPY.cityLabel });
    fireEvent.change(city, { target: { value: 'Ot' } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    await screen.findByRole('listbox');
    expect(city).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(city, { key: 'ArrowDown' });
    fireEvent.keyDown(city, { key: 'ArrowDown' });
    const active = city.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveTextContent('Ottawa');

    fireEvent.keyDown(city, { key: 'Enter' });
    expect(city).toHaveValue('Ottawa');
    expect(city).toHaveAttribute('aria-expanded', 'false');

    fireEvent.change(city, { target: { value: 'Tor' } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    await screen.findByRole('listbox');
    fireEvent.keyDown(city, { key: 'Escape' });
    expect(city).toHaveAttribute('aria-expanded', 'false');
  });
});
