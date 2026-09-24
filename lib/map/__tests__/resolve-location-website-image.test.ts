import { describe, expect, it, vi } from 'vitest';
import {
  extractPageImage,
  extractWebsiteFromMapboxRetrieve,
  isBlockedFetchUrl,
  normalizeHttpsWebsiteUrl,
  resolveLocationWebsiteImage,
} from '../resolve-location-website-image';

describe('extractPageImage', () => {
  const page = 'https://slanteddoor.com/';

  it('reads og:image and resolves relative URLs', () => {
    expect(
      extractPageImage('<meta property="og:image" content="/hero.jpg">', page)
    ).toEqual({ url: 'https://slanteddoor.com/hero.jpg', source: 'og:image' });
  });

  it('falls back to twitter:image', () => {
    expect(
      extractPageImage(
        '<meta name="twitter:image" content="https://cdn.example/x.jpg">',
        page
      )
    ).toEqual({ url: 'https://cdn.example/x.jpg', source: 'twitter:image' });
  });

  it('falls back to link rel="image_src"', () => {
    expect(
      extractPageImage(
        '<link rel="image_src" href="https://cdn.example/link.jpg">',
        page
      )
    ).toEqual({ url: 'https://cdn.example/link.jpg', source: 'image_src' });
  });

  it('falls back to a JSON-LD image', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Restaurant',
      image: 'https://static.example/media/hero.png',
    })}</script>`;

    expect(extractPageImage(html, page)).toEqual({
      url: 'https://static.example/media/hero.png',
      source: 'json-ld',
    });
  });

  it('reads a JSON-LD image nested in an array or object', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@graph': [
        { '@type': 'WebSite' },
        { '@type': 'Place', image: [{ url: 'https://static.example/a.jpg' }] },
      ],
    })}</script>`;

    expect(extractPageImage(html, page)?.url).toBe(
      'https://static.example/a.jpg'
    );
  });

  it('falls back to the largest inline img, ignoring placeholders and logos', () => {
    const html = [
      '<img src="https://cdn.example/logo.png" width="800" height="400">',
      '<img src="https://cdn.example/tiny.jpg" width="120" height="90">',
      '<img src="https://cdn.example/media/w_48,h_33,blur_2/lqip.png" width="980" height="666">',
      '<img src="https://cdn.example/media/dining-room.jpg" width="900" height="600">',
    ].join('');

    expect(extractPageImage(html, page)).toEqual({
      url: 'https://cdn.example/media/dining-room.jpg',
      source: 'img-tag',
    });
  });

  it('returns null when the page exposes no usable image', () => {
    expect(extractPageImage('<html><title>Hi</title></html>', page)).toBeNull();
  });
});

describe('extractWebsiteFromMapboxRetrieve', () => {
  it('reads metadata.website from the first feature', () => {
    expect(
      extractWebsiteFromMapboxRetrieve({
        features: [
          { properties: { metadata: { website: 'https://venue.example' } } },
        ],
      })
    ).toBe('https://venue.example');
  });

  it('returns null when website is missing', () => {
    expect(
      extractWebsiteFromMapboxRetrieve({ features: [{ properties: {} }] })
    ).toBeNull();
  });
});

describe('SSRF and URL guards', () => {
  it('allows public https URLs', () => {
    expect(isBlockedFetchUrl('https://venue.example/photo.jpg')).toBe(false);
  });

  it('rejects http, loopback, and private hosts', () => {
    expect(isBlockedFetchUrl('http://venue.example/x')).toBe(true);
    expect(isBlockedFetchUrl('https://127.0.0.1/x')).toBe(true);
    expect(isBlockedFetchUrl('https://192.168.1.9/x')).toBe(true);
    expect(isBlockedFetchUrl('https://10.0.0.2/x')).toBe(true);
    expect(isBlockedFetchUrl('https://169.254.169.254/latest')).toBe(true);
    expect(isBlockedFetchUrl('https://localhost/x')).toBe(true);
  });

  it('rejects Google-hosted image hosts', () => {
    expect(
      isBlockedFetchUrl('https://lh3.googleusercontent.com/photo.jpg')
    ).toBe(true);
  });

  it('normalizes hostnames without a protocol to https', () => {
    expect(normalizeHttpsWebsiteUrl('www.venue.example')).toBe(
      'https://www.venue.example/'
    );
    expect(normalizeHttpsWebsiteUrl('http://venue.example')).toBeNull();
  });
});

describe('resolveLocationWebsiteImage', () => {
  it('returns null for temp search place ids without fetching', async () => {
    const fetchImpl = vi.fn();
    await expect(
      resolveLocationWebsiteImage('temp-123', { fetchImpl, mapboxToken: 'tok' })
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('scrapes og:image and rehosts when Mapbox has a website', async () => {
    const fetchImpl = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('api.mapbox.com')) {
        return new Response(
          JSON.stringify({
            features: [
              {
                properties: {
                  metadata: { website: 'https://venue.example' },
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url === 'https://venue.example/' || url === 'https://venue.example') {
        return new Response(
          '<meta property="og:image" content="https://cdn.venue.example/hero.jpg">',
          { status: 200, headers: { 'content-type': 'text/html' } }
        );
      }
      if (url === 'https://cdn.venue.example/hero.jpg') {
        return new Response(Buffer.from('fake-image-bytes'), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        });
      }
      return new Response('not found', { status: 404 });
    });

    const upload = vi.fn(async () => ({
      url: 'https://cdn.irl/full.webp',
      imageUrl: 'https://cdn.irl/full.webp',
      thumbnailUrl: 'https://cdn.irl/thumb.webp',
    }));

    const result = await resolveLocationWebsiteImage('dXJuOm1ieHBvaTp0ZXN0', {
      fetchImpl,
      mapboxToken: 'tok',
      upload,
    });

    expect(result).toEqual({
      imageUrl: 'https://cdn.irl/full.webp',
      thumbnailUrl: 'https://cdn.irl/thumb.webp',
    });
    expect(upload).toHaveBeenCalledOnce();
  });

  it('still finds og:image on a page larger than the HTML byte cap', async () => {
    const hugeHtml = `<head><meta property="og:image" content="https://cdn.venue.example/hero.jpg"></head><body>${'x'.repeat(
      600 * 1024
    )}</body>`;

    const fetchImpl = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('api.mapbox.com')) {
        return new Response(
          JSON.stringify({
            features: [
              {
                properties: { metadata: { website: 'https://venue.example' } },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url === 'https://venue.example/' || url === 'https://venue.example') {
        return new Response(hugeHtml, {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      if (url === 'https://cdn.venue.example/hero.jpg') {
        return new Response(Buffer.from('fake-image-bytes'), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        });
      }
      return new Response('not found', { status: 404 });
    });

    const upload = vi.fn(async () => ({
      url: 'https://cdn.irl/full.webp',
      imageUrl: 'https://cdn.irl/full.webp',
      thumbnailUrl: 'https://cdn.irl/thumb.webp',
    }));

    await expect(
      resolveLocationWebsiteImage('dXJuOm1ieHBvaTp0ZXN0', {
        fetchImpl,
        mapboxToken: 'tok',
        upload,
      })
    ).resolves.toEqual({
      imageUrl: 'https://cdn.irl/full.webp',
      thumbnailUrl: 'https://cdn.irl/thumb.webp',
    });
  });

  it('returns null when Mapbox has no website', async () => {
    const fetchImpl = vi.fn(async (input: string | URL) => {
      if (String(input).includes('api.mapbox.com')) {
        return new Response(
          JSON.stringify({ features: [{ properties: {} }] }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }
      return new Response('nope', { status: 500 });
    });

    await expect(
      resolveLocationWebsiteImage('dXJuOm1ieHBvaTp0ZXN0', {
        fetchImpl,
        mapboxToken: 'tok',
        upload: vi.fn(),
      })
    ).resolves.toBeNull();
  });

  it('does not follow redirects onto a private host', async () => {
    const fetchImpl = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('api.mapbox.com')) {
        return new Response(
          JSON.stringify({
            features: [
              {
                properties: { metadata: { website: 'https://venue.example' } },
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.startsWith('https://venue.example')) {
        return new Response(null, {
          status: 302,
          headers: { location: 'https://127.0.0.1/secret' },
        });
      }
      return new Response('should not fetch', { status: 200 });
    });

    await expect(
      resolveLocationWebsiteImage('dXJuOm1ieHBvaTp0ZXN0', {
        fetchImpl,
        mapboxToken: 'tok',
        upload: vi.fn(),
      })
    ).resolves.toBeNull();
  });
});
