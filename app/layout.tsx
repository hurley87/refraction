import type { Metadata, Viewport } from 'next';

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
 * Canonical site origin for metadata (icons, OG). Ensures relative URLs resolve
 * correctly when deployed (e.g. custom domain vs preview URL).
 */
function getMetadataBase(): URL {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://irl.energy';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return new URL(withProtocol.replace(/\/$/, ''));
}

const metadataBase = getMetadataBase();
const baseUrl = metadataBase.origin;

// Add cache-busting parameter to force Twitter to refresh cached images
// Increment the version number when you update the image
const imageUrl = `${baseUrl}/irl-share.png?v=2`;

export const metadata: Metadata = {
  metadataBase,
  title: 'IRL',
  description: "IRL - Culture's rewards program.",
  /** Favicon: `app/icon.svg` (Next injects `<link rel="icon" href="/icon?…">`). */
  openGraph: {
    title: '$IRL',
    description: "IRL - Culture's rewards program.",
    url: baseUrl,
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
