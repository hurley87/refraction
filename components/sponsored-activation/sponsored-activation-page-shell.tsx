'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SponsoredActivationPageShellProps = {
  children: ReactNode;
  className?: string;
  /** Full-bleed activation screens (hero edge-to-edge, no top inset). */
  flush?: boolean;
};

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
      <main
        className={cn(
          'relative z-0 mx-auto w-full max-w-[420px] md:max-w-lg',
          flush ? 'px-0 pb-0 pt-0' : 'px-0 pb-8 pt-4'
        )}
      >
        {children}
      </main>
    </div>
  );
}
