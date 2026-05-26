'use client';

import type { ReactNode } from 'react';
import Header from '@/components/layout/header';
import { cn } from '@/lib/utils';

type SponsoredActivationPageShellProps = {
  children: ReactNode;
  className?: string;
  /** Full-bleed activation screens (hero edge-to-edge). */
  flush?: boolean;
};

/**
 * Mobile-first shell for `/activation/:id` — light canvas aligned with Figma prod flow.
 */
export function SponsoredActivationPageShell({
  children,
  className,
  flush = false,
}: SponsoredActivationPageShellProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-x-hidden bg-white',
        className
      )}
    >
      <Header />
      <main
        className={cn(
          'relative z-0 mx-auto w-full max-w-[420px] md:max-w-lg',
          flush ? 'px-0 pb-0 pt-20 md:pt-24' : 'px-0 pb-8 pt-20 md:pt-24'
        )}
      >
        {children}
      </main>
    </div>
  );
}
