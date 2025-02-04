import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout";
import { Space_Grotesk } from "next/font/google";

export const metadata: Metadata = {
  title: "$IRL",
  description: "$IRL is your key to unlocking a new way to experience culture",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen">
      <div className="relative flex flex-col  bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between font-sans">
        <div className="flex ">
          <div className="flex-none">
            <Image
              src="/images/$IRL_PRIMARY LOGO_BLACK.svg"
              alt="IRL"
              width={100}
              height={100}
            />
          </div>
          <div className="flex-auto wd-6 ">&nbsp;</div>

          
        </div>
      </div>
      {children}

      
      <Toaster />
    </div>
  );
}
