import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';

import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import Providers from '@/components/shared/providers';
import { Toaster } from '@/components/ui/sonner';
import Script from 'next/script';
import Image from 'next/image';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

/**
 * Fallback site origin for metadata (build time, or when the request host is unknown).
 */
function getDefaultMetadataBase(): URL {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://irl.energy';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return new URL(withProtocol.replace(/\/$/, ''));
}

const LINK_PREVIEW_FILE = 'IRL WEB PREVIEW_01.png';

/**
 * X / Facebook compare the request URL to og:url and image URLs. If everything
 * is hard-coded to `irl.energy` but the link is shared as `www.irl.energy`, the
 * card can fail. Only allow our domains + dev hosts so we never reflect arbitrary
 * Host into metadata.
 */
function isAllowedMetadataHost(host: string): boolean {
  if (host === 'irl.energy' || host === 'www.irl.energy') return true;
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;
  if (host.endsWith('.vercel.app')) return true;
  return false;
}

/**
 * `metadataBase` + absolute OG / Twitter image URLs for this request
 * (www vs non-www, preview domain, local dev).
 */
function getMetadataBaseForRequest(h: Pick<Headers, 'get'>): {
  metadataBase: URL;
  imageUrl: string;
} {
  const forwarded = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const host = forwarded.split(',')[0].trim();
  if (!host || !isAllowedMetadataHost(host)) {
    const metadataBase = getDefaultMetadataBase();
    const imageUrl = `${metadataBase.origin}/link-preview/${encodeURIComponent(LINK_PREVIEW_FILE)}?v=1`;
    return { metadataBase, imageUrl };
  }

  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protoHeader = h.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol =
    isLocal && protoHeader === 'https' ? 'https' : isLocal ? 'http' : 'https';
  const metadataBase = new URL(`${protocol}://${host}`);
  const imageUrl = `${metadataBase.origin}/link-preview/${encodeURIComponent(LINK_PREVIEW_FILE)}?v=1`;
  return { metadataBase, imageUrl };
}

export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const { metadataBase, imageUrl } = getMetadataBaseForRequest(h);

  return {
    metadataBase,
    title: 'IRL',
    description: "IRL - Culture's rewards program.",
    /** Favicon: `app/icon.svg` (Next injects `<link rel="icon" href="/icon?…">`). */
    openGraph: {
      title: '$IRL',
      description: "IRL - Culture's rewards program.",
      url: new URL('/', metadataBase).href,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: '$IRL',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: '$IRL',
      description: "IRL - Culture's rewards program.",
      images: [imageUrl],
    },
    appleWebApp: {
      statusBarStyle: 'black-translucent', // Options: "default", "black", "black-translucent"
    },
    other: {
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'mobile-web-app-capable': 'yes',
      'msapplication-navbutton-color': '#000000',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        {/* Inline script (not next/script beforeInteractive): avoids hydration mismatch — Next injects beforeInteractive children via __next_s with empty SSR markup. */}
        <script
          id="suppress-extension-errors"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = function() {
    const message = arguments[0] != null ? String(arguments[0]) : '';
    if (
      message.includes('runtime.lastError') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Could not establish connection') ||
      message.includes('Extension context invalidated') ||
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property') ||
      message.includes('ERR_NAME_NOT_RESOLVED') ||
      message.includes('googletagmanager.com') ||
      message.includes('net::ERR_NAME_NOT_RESOLVED')
    ) {
      return;
    }
    originalError.apply(console, arguments);
  };
  console.warn = function() {
    const message = arguments[0] != null ? String(arguments[0]) : '';
    if (message.includes('SES Removing unpermitted intrinsics')) {
      return;
    }
    originalWarn.apply(console, arguments);
  };
  window.addEventListener('error', function(event) {
    const message = event.message || '';
    const source = event.filename || '';
    if (
      message.includes('runtime.lastError') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Could not establish connection') ||
      message.includes('Extension context invalidated') ||
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property') ||
      message.includes('ERR_NAME_NOT_RESOLVED') ||
      source.includes('googletagmanager.com') ||
      message.includes('net::ERR_NAME_NOT_RESOLVED')
    ) {
      event.preventDefault();
      return false;
    }
  }, true);
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const message =
      reason && typeof reason === 'object' && reason != null && 'message' in reason
        ? String(reason.message)
        : reason != null
          ? String(reason)
          : '';
    if (
      message.includes('runtime.lastError') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Could not establish connection') ||
      message.includes('Extension context invalidated') ||
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property')
    ) {
      event.preventDefault();
      return false;
    }
  });
})();
`.trim(),
          }}
        />
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-screen min-w-screen">
        {/* Top Corner Decorations */}
        <div className="fixed top-0 left-0 z-[100] pointer-events-none">
          <Image
            src="/app-corner-left.svg"
            alt=""
            width={26}
            height={24}
            className="block"
            unoptimized
          />
        </div>
        <div className="fixed top-0 right-0 z-[100] pointer-events-none">
          <Image
            src="/app-corner-right.svg"
            alt=""
            width={26}
            height={24}
            className="block"
            unoptimized
          />
        </div>

        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
