import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const pleasure = localFont({
  src: "./fonts/Pleasure-Inktrap-Bold.otf",
  variable: "--font-pleasure-bold",
  weight: "100 900",
});

const anonymousRegular = localFont({
  src: "./fonts/AnonymousPro-Regular.ttf",
  variable: "--font-anonymous-regular",
  weight: "100 900",
});

const anonymousItalic = localFont({
  src: "./fonts/AnonymousPro-Italic.ttf",
  variable: "--font-anonymous-italic",
  weight: "100 900",
});

const anonymousBold = localFont({
  src: "./fonts/AnonymousPro-Bold.ttf",
  variable: "--font-anonymous-bold",
  weight: "100 900",
});

const anonymousBoldItalic = localFont({
  src: "./fonts/AnonymousPro-BoldItalic.ttf",
  variable: "--font-anonymous-bold-italic",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "$IRL",
  description: "$IRL is your key to unlocking a new way to experience culture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`h-screen ${geistSans.variable} ${geistMono.variable} ${pleasure.variable} ${anonymousRegular.variable} ${anonymousItalic.variable} ${anonymousBold.variable} ${anonymousBoldItalic.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
