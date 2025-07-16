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
        className={`flex flex-col gap-6 lg:p-6 p-2 bg-gradient-to-b from-[#F24405] via-[#61C3D7] to-[#17A74D]`}
      >
        {/* 4-Column Flexbox Header */}
        <div className="flex justify-between items-center border-2 border-black">
          {/* Column 1: IRL Logo - 60% width */}
          <div className="flex-[0.6] flex justify-start border-r border-black p-2 lg:px-4">
            <Link href="/">
              <Image 
                src="/images/irl-landing-logo.png" 
                alt="IRL" 
                width={108.38} 
                height={55.55} 
                className="w-full h-full"
              />
            </Link>
          </div>

          {/* Column 2: About Link - 13.33% width */}
          <div className="flex-[0.133] flex justify-center border-r border-black p-2 lg:px-4">
            <Link 
              href="/about" 
              className="text-black hover:text-gray-200 transition-colors duration-200 font-medium"
            >
              About
            </Link>
          </div>

          {/* Column 3: Join Link - 13.33% width */}
          <div className="flex-[0.133] flex justify-center border-r border-black p-2 lg:px-4">
            <Link 
              href="/join" 
              className="text-black hover:text-gray-200 transition-colors duration-200 font-medium"
            >
              Join
            </Link>
          </div>

          {/* Column 4: FAQs Link - 13.33% width */}
          <div className="flex-[0.134] flex justify-center p-2 lg:px-4">
            <Link 
              href="/faqs" 
              className="text-black hover:text-gray-200 transition-colors duration-200 font-medium"
            >
              FAQs
            </Link>
          </div>
        </div>
        {children}
      </div>
      <Toaster />
    </div>
  );
}
