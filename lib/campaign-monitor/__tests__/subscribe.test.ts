import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addCampaignMonitorSubscriber } from '../subscribe';

describe('addCampaignMonitorSubscriber', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: async () => '"user@example.com"',
      })
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('no-ops when credentials are not configured', async () => {
    delete process.env.CAMPAIGN_MONITOR_API_KEY;
    delete process.env.CAMPAIGN_MONITOR_LIST_ID;

    await addCampaignMonitorSubscriber({
      email: 'user@example.com',
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('no-ops when env is only whitespace', async () => {
    process.env.CAMPAIGN_MONITOR_API_KEY = '   ';
    process.env.CAMPAIGN_MONITOR_LIST_ID = '  \t';

    await addCampaignMonitorSubscriber({ email: 'user@example.com' });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('POSTs to CreateSend with Basic auth and JSON body', async () => {
    process.env.CAMPAIGN_MONITOR_API_KEY = '  test-api-key  ';
    process.env.CAMPAIGN_MONITOR_LIST_ID = '  list-id-abc  ';

    await addCampaignMonitorSubscriber({
      email: 'user@example.com',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(
      'https://api.createsend.com/api/v3.3/subscribers/list-id-abc.json'
    );
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(
      `Basic ${Buffer.from('test-api-key:x', 'utf8').toString('base64')}`
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      EmailAddress: 'user@example.com',
      ConsentToTrack: 'Yes',
    });
  });

  it('includes Name when username is provided', async () => {
    process.env.CAMPAIGN_MONITOR_API_KEY = 'k';
    process.env.CAMPAIGN_MONITOR_LIST_ID = 'lid';

    await addCampaignMonitorSubscriber({
      email: 'a@b.co',
      username: 'coolhandle',
    });

    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
    ).toEqual({
      EmailAddress: 'a@b.co',
      Name: 'coolhandle',
      ConsentToTrack: 'Yes',
    });
  });

  it('throws when API returns error', async () => {
    process.env.CAMPAIGN_MONITOR_API_KEY = 'k';
    process.env.CAMPAIGN_MONITOR_LIST_ID = 'lid';
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => '{"Code":1}',
    });

    await expect(
      addCampaignMonitorSubscriber({ email: 'x@y.z' })
    ).rejects.toThrow('Campaign Monitor subscriber API failed');
  });
});
