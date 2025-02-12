import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import Link from "next/link";

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
        className={`relative flex flex-col gap-6 bg-[#020303] via-5% to-black to-100% px-4 text-white dark:border-r justify-between font-sans`}
      >
        <div className="flex justify-start py-4">
          <div className="flex-none">
            <Link href="/">
              <Image src="/ledger/Logo.png" alt="IRL" width={36} height={34} />
            </Link>
          </div>
        </div>
        {children}
      </div>
      <Toaster />
    </div>
  );
}
