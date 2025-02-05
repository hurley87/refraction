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
      <div className="relative flex flex-col gap-6 bg-[#E8E3DA] px-4 text-BLACK dark:border-r justify-between font-sans">
        <div className="flex justify-start py-2">
          <div className="flex-none">
            <Image
              src="/images/$IRL_PRIMARY LOGO_BLACK.svg"
              alt="IRL"
              width={42}
              height={39}
            />
          </div>
        </div>
        {children}
      </div>
      <Toaster />
    </div>
  );
}
