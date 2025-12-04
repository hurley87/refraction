import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Auth from "@/components/auth";

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
        className="flex flex-col gap-6 min-h-screen p-4"
        style={{
          background: "url('/bg-funky.png') no-repeat center center fixed",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Auth>{children}</Auth>
      </div>
      <Toaster />
    </div>
  );
}










