import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import AuthWrapper from '@/components/auth/auth-wrapper';

export const metadata: Metadata = {
  title: '$IRL',
  description: '$IRL is your key to unlocking a new way to experience culture',
};

export default function CheckpointLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-dvh overflow-y-auto">
      <div
        className="flex flex-col min-h-full"
        style={{
          background: "url('/bg-funky.png') no-repeat center center fixed",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <AuthWrapper requireUsername requireEmail>
          {children}
        </AuthWrapper>
      </div>
      <Toaster />
    </div>
  );
}
