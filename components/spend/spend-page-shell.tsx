'use client';

import type { ReactNode } from 'react';

import Header from '@/components/layout/header';
import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
import { cn } from '@/lib/utils';

type SpendPageShellProps = {
  children: ReactNode;
  /** Short label above the page title (matches hero / map section pattern). */
  eyebrow?: string;
  /** When false, only the layout wrapper is shown (e.g. full-page loading). */
  showCard?: boolean;
  className?: string;
};

/**
 * Layout for `/spend/:id` flows: same dark canvas, header, and frosted panel
 * treatment as the homepage map stack (`MapCard`-style glass).
 */
export function SpendPageShell({
  children,
  eyebrow = 'Spend with IRL',
  showCard = true,
  className,
}: SpendPageShellProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-x-hidden bg-[#131313]',
        className
      )}
    >
      <Header />
      <main className="relative z-0 px-4 pb-16 pt-28 md:mx-auto md:max-w-7xl md:px-[171px] md:pr-[217px] md:pb-24 md:pt-32">
        <div className="mx-auto w-full max-w-[361px] md:max-w-lg">
          {showCard ? (
            <>
              <div className="mb-6 flex items-center gap-2 md:mb-8">
                <WelcomeEllipse />
                <span className="title5 font-grotesk text-white">
                  {eyebrow}
                </span>
              </div>
              <div className="overflow-hidden rounded-sm border border-[rgba(255,255,255,0.15)] bg-white/95 p-3 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px] md:p-4">
                <div className="px-1 pb-1 pt-0 md:px-2 md:pb-2">{children}</div>
              </div>
            </>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
