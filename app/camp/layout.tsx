import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "$IRL",
  description: "$IRL is your key to unlocking a new way to experience culture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Providers>{children}</Providers>;
}
