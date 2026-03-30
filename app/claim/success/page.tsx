'use client';

import { Suspense } from 'react';
import ClaimHeader from '@/components/claim/claim-header';
import { ClaimSuccessContent } from './claim-success-content';

function SuccessLoadingFallback() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131313]">
      <div className="relative z-10 flex min-h-screen flex-col">
        <header>
          <ClaimHeader />
        </header>
        <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-6">
          <p className="text-center text-sm font-grotesk text-[#7D7D7D]">
            Loading...
          </p>
        </main>
      </div>
    </div>
  );
}

/**
 * Success UI after NFT claim.
 *
 * **Style without minting:** while logged in, open `/claim/success?preview=1`
 * (works in any build; no env flag required).
 */
export default function ClaimSuccessPage() {
  return (
    <Suspense fallback={<SuccessLoadingFallback />}>
      <ClaimSuccessContent />
    </Suspense>
  );
}
