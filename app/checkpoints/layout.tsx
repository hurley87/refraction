import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";

export const metadata: Metadata = {
  title: "$IRL",
  description: "$IRL is your key to unlocking a new way to experience culture",
};

const gradientColors: Record<number, string> = {
  1: "from-red-900",
  2: "from-blue-900",
  3: "from-green-900",
  4: "from-purple-900",
  5: "from-orange-900",
  // Add more color variants as needed
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { id?: string };
}>) {
  const numericId = params.id ? parseInt(params.id) : 1;
  const gradientColor = gradientColors[numericId] || gradientColors[1]; // Default to first color
  console.log("id",numericId);
  console.log("gradientcolor",gradientColor);
  return (
    <div className="h-screen">
      <div className={`relative flex flex-col gap-6 bg-gradient-to-b ${gradientColor} from-0% via-black via-5% to-black to-100% px-4 text-white dark:border-r justify-between font-sans`}>
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
