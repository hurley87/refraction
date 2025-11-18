import type { Metadata, Viewport } from "next";

import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import FarcasterReady from "@/components/farcaster-ready";

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
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}"
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
      </head>
      <body className="min-h-screen min-w-screen">
        <FarcasterReady />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
