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
        className={`flex flex-col gap-6 p-6 bg-gradient-to-b from-[#64C2D7] via-[#FFE600] to-[#F09BC2]`}
      >
        <div className="flex justify-between items-center">
          <Link href="/">
            <Image src="/irl.svg" alt="IRL" width={49} height={25} />
          </Link>
          <Header />
        </div>
        <Auth>{children}</Auth>
      </div>
      <Toaster />
    </div>
  );
}
