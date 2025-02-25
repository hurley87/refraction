import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import Link from "next/link";
import Auth from "@/components/auth";
import Header from "@/components/header";

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
        style={{ backgroundImage: "url('/bg.svg')" }}
        className={`flex flex-col gap-6 p-6`}
      >
        <div className="flex justify-between items-center">
          <Link href="/">
            <Image src="/logo.png" alt="IRL" width={49} height={25} />
          </Link>
          <Header />
        </div>
        <Auth>{children}</Auth>
      </div>
      <Toaster />
    </div>
  );
}
