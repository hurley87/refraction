'use client';

export function SponsoredActivationCancelled() {
  return (
    <div className="flex flex-col gap-3 px-4 py-8 text-center md:px-6">
      <h1 className="title2 text-[#171717]">This redemption was cancelled</h1>
      <p className="body-medium font-grotesk text-[#757575]">
        This perk is no longer available on your account for this activation.
      </p>
    </div>
  );
}
