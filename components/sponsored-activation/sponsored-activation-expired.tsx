'use client';

export function SponsoredActivationExpired() {
  return (
    <div className="flex flex-col gap-3 px-4 py-8 text-center md:px-6">
      <h1 className="title2 text-[#171717]">This offer has expired</h1>
      <p className="body-medium font-grotesk text-[#757575]">
        This redemption is no longer valid. If you think this is a mistake, ask
        staff at the venue.
      </p>
    </div>
  );
}
