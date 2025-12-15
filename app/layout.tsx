import type { Metadata, Viewport } from "next";

import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import Image from "next/image";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

// Get base URL for absolute image URLs (required for Twitter cards)
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Default fallback - update this to your production domain
  return "https://irl.energy";
};

const baseUrl = getBaseUrl();
// Add cache-busting parameter to force Twitter to refresh cached images
// Increment the version number when you update the image
const imageUrl = `${baseUrl}/irl-share.png?v=2`;

export const metadata: Metadata = {
  title: "IRL",
  description: "IRL - Culture's rewards program.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "$IRL",
    description: "IRL - Culture's rewards program.",
    url: baseUrl,
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: "$IRL",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$IRL",
    description: "IRL - Culture's rewards program.",
    images: [imageUrl],
  },
  appleWebApp: {
    statusBarStyle: "black-translucent", // Options: "default", "black", "black-translucent"
  },
  other: {
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
    "msapplication-navbutton-color": "#000000",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        {/* Suppress harmless browser extension errors */}
        <Script id="suppress-extension-errors" strategy="beforeInteractive">
          {`
            // Suppress harmless browser extension errors
            (function() {
              const originalError = console.error;
              console.error = function(...args) {
                const message = args[0]?.toString() || '';
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
                  return; // Suppress these errors
                }
                originalError.apply(console, args);
              };

              // Also suppress unhandled errors from extensions
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

              // Suppress unhandled promise rejections from extensions
              window.addEventListener('unhandledrejection', function(event) {
                const message = event.reason?.message || event.reason?.toString() || '';
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
          `}
        </Script>
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
