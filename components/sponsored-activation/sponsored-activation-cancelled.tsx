'use client';

export function SponsoredActivationCancelled() {
  return (
    <div className="flex flex-col gap-3 p-6 text-center md:p-8">
      <h1 className="title2 text-white">This redemption was cancelled</h1>
      <p className="body-medium font-grotesk text-white/70">
        This perk is no longer available on your account for this activation.
      </p>
    </div>
  );
}
