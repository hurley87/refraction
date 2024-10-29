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

const anonymous = localFont({
  src: [
    { path: "./fonts/AnonymousPro-Regular.ttf",
      style: "--font-anonymous-regular",
      weight: "100 900",
    },
    { path: "./fonts/AnonymousPro-Italic.ttf",
      style: "--font-anonymous-italic",
      weight: "100 900",
    },
    { path: "./fonts/AnonymousPro-Bold.ttf",
      style: "--font-anonymous-bold",
      weight: "100 900",
    },
    { path: "./fonts/AnonymousPro-BoldItalic.ttf",
      style: "--font-anonymous-bold-italic",
      weight: "100 900",
    },
  ],
})

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
        className={`${geistSans.variable} ${geistMono.variable} ${pleasure.variable} ${anonymous.className} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
