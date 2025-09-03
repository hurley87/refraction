import type { Metadata } from "next";

import "./globals.css";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "$IRL",
  description: "$IRL is your key to unlocking a new way to experience culture",
  themeColor: "#000000", // Change this to your desired color
  appleWebApp: {
    statusBarStyle: "black-translucent", // Options: "default", "black", "black-translucent"
  },
  other: {
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-navbutton-color": "#000000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
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
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
