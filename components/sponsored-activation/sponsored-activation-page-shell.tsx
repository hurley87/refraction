'use client';

import type { ReactNode } from 'react';
import Header from '@/components/layout/header';
import { cn } from '@/lib/utils';

type SponsoredActivationPageShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Mobile-first shell for `/activation/:id` — light canvas aligned with Figma prod flow.
 */
export function SponsoredActivationPageShell({
  children,
  className,
}: SponsoredActivationPageShellProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-x-hidden bg-white',
        className
      )}
    >
      <Header />
      <main className="relative z-0 mx-auto w-full max-w-[420px] pb-8 pt-20 md:max-w-lg md:pt-24">
        {children}
      </main>
    </div>
  );
}
