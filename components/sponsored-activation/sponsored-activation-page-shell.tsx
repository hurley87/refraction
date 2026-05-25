'use client';

import type { ReactNode } from 'react';
import Header from '@/components/layout/header';
import { cn } from '@/lib/utils';

type SponsoredActivationPageShellProps = {
  children: ReactNode;
  /** When false, full-bleed content (e.g. loading). */
  showCard?: boolean;
  className?: string;
};

/**
 * Mobile-first shell for `/activation/:id` — dark canvas + header; inner card optional.
 */
export function SponsoredActivationPageShell({
  children,
  showCard = true,
  className,
}: SponsoredActivationPageShellProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-x-hidden bg-[#0a0a0a]',
        className
      )}
    >
      <Header />
      <main className="relative z-0 mx-auto w-full max-w-[420px] px-4 pb-28 pt-24 md:max-w-lg md:px-6 md:pb-32 md:pt-28">
        {showCard ? (
          <div className="overflow-hidden rounded-md border border-white/10 bg-[#141414] shadow-lg">
            {children}
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
