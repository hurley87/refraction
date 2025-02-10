import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";

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
      <div className="relative flex flex-col gap-6 bg-gradient-to-b from-red-900 from-0% via-black via-15% to-black to-100% px-4 text-white dark:border-r justify-between font-sans">
        <div className="flex justify-start py-2">
          <div className="flex-none">
            <Image
              src="/images/white-logo-36x34.png"
              alt="IRL"
              width={36}
              height={34}
            />
          </div>
        </div>
        {children}
      </div>
      <Toaster />
    </div>
  );
}
