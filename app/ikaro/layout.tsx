import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import Link from "next/link";
import Auth from "@/components/ikaro-auth";
import Header from "@/components/ikaro-header";

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
    <div className="h-screen">
      <div
        className={`flex flex-col gap-6 p-6 bg-gradient-to-b from-[#61BFD1] via-[#1BA351] to-[#FFE600]`}
      >
        <div className="flex justify-between items-center">
          <Link href="/">
            <Image src="/images/ikaro/irl-logo.png" alt="IRL" width={40} height={40} />
          </Link>
          <Header />
        </div>
        <Auth>{children}</Auth>
      </div>
      <Toaster />
    </div>
  );
}
