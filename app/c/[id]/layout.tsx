import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import AuthWrapper from "@/components/auth/auth-wrapper";

export const metadata: Metadata = {
  title: "$IRL",
  description: "$IRL is your key to unlocking a new way to experience culture",
};

export default function CheckpointLayout({
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
        <AuthWrapper requireUsername requireEmail>{children}</AuthWrapper>
      </div>
      <Toaster />
    </div>
  );
}
