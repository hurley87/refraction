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

function GoogleFontLink({ fontFamily }: { fontFamily?: string | null }) {
  if (!fontFamily) return null;
  const encoded = fontFamily.replace(/\s+/g, '+');
  return (
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800&display=swap`}
    />
  );
}

export default async function CheckpointLayout({
  children,
  params,
}: Readonly<CheckpointLayoutProps>) {
  const resolvedParams = await Promise.resolve(params);
  const checkpoint = await getActiveCheckpointById(resolvedParams.id);

  return (
    <>
      <GoogleFontLink fontFamily={checkpoint?.font_family} />
      <div className="min-h-dvh overflow-y-auto">
        <AuthWrapper
          requireUsername
          requireEmail
          authContextName={checkpoint?.name}
          authContextDescription={checkpoint?.description ?? undefined}
          authContextLoginCtaText={checkpoint?.login_cta_text ?? undefined}
          checkpointCustomization={
            checkpoint
              ? {
                  partnerImageUrl: checkpoint.partner_image_url ?? undefined,
                  backgroundGradient: checkpoint.background_gradient ?? undefined,
                  fontFamily: checkpoint.font_family ?? undefined,
                  fontColor: checkpoint.font_color ?? undefined,
                  footerTitle: checkpoint.footer_title ?? undefined,
                  footerDescription: checkpoint.footer_description ?? undefined,
                }
              : undefined
          }
        >
          <div className="min-h-dvh w-full">{children}</div>
        </AuthWrapper>
        <Toaster />
      </div>
    </>
  );
}
