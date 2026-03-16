import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Stripe Commons CDMX | IRL',
  description:
    'Claim your exclusive artwork and IRL Points at Stripe Commons CDMX – March 18, 2025',
};

export default function StripeCommonsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      {children}
      <Toaster />
    </div>
  );
}
