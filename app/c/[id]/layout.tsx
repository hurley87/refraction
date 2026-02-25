import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import AuthWrapper from '@/components/auth/auth-wrapper';
import { getActiveCheckpointById } from '@/lib/db/checkpoints';

export const metadata: Metadata = {
  title: 'IRL',
  description: 'IRL is your key to unlocking a new way to experience culture',
};

interface CheckpointLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }> | { id: string };
}

export default async function CheckpointLayout({
  children,
  params,
}: Readonly<CheckpointLayoutProps>) {
  const resolvedParams = await Promise.resolve(params);
  const checkpoint = await getActiveCheckpointById(resolvedParams.id);

  return (
    <div className="min-h-dvh overflow-y-auto">
      <div
        className="flex min-h-dvh flex-col"
        style={{
          background: "url('/bg-funky.png') no-repeat center center fixed",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <AuthWrapper
          requireUsername
          requireEmail
          authContextName={checkpoint?.name}
          authContextDescription={checkpoint?.description ?? undefined}
        >
          <div className="min-h-dvh w-full">{children}</div>
        </AuthWrapper>
      </div>
      <Toaster />
    </div>
  );
}
