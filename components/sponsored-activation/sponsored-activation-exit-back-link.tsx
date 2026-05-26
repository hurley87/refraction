import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SPONSORED_ACTIVATION_EXIT_URL } from '@/lib/sponsored-activation/exit-url';

export function SponsoredActivationExitBackLink() {
  return (
    <Link
      href={SPONSORED_ACTIVATION_EXIT_URL}
      className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex size-10 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90"
      aria-label="Back to IRL"
    >
      <ArrowLeft className="size-5 text-[#171717]" strokeWidth={2} />
    </Link>
  );
}
