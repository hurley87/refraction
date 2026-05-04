'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/header';

/** Matches perk / rewards mobile detail screens (IRL Production v2). */
export const SPEND_PAGE_GRADIENT =
  'linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)';

/** Primary action: black pill, same as `/perks/[perkId]`. */
export const spendPrimaryCtaClass =
  'w-full rounded-full py-3 font-inktrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

type SpendPageShellProps = {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function SpendPageShell({
  children,
  backHref = '/',
  backLabel = 'Back',
}: SpendPageShellProps) {
  return (
    <div
      style={{ background: SPEND_PAGE_GRADIENT }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="mx-auto min-h-screen max-w-lg">
        <Header />

        <div className="mb-4 px-0 pt-16">
          <div className="rounded-2xl bg-white p-4">
            <Link
              href={backHref}
              className="flex items-center text-sm font-inktrap text-gray-600 transition-opacity hover:opacity-80"
            >
              <ArrowLeft className="mr-1 h-4 w-4 shrink-0" />
              {backLabel}
            </Link>
          </div>
        </div>

        <div className="space-y-4 px-0 pb-8">{children}</div>

        <div className="py-6">
          {/* Match perks detail: decorative footer mark */}
          <img
            src="/irl-bottom-logo.svg"
            alt="IRL"
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
