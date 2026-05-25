'use client';

export function SponsoredActivationExpired() {
  return (
    <div className="flex flex-col gap-3 p-6 text-center md:p-8">
      <h1 className="title2 text-white">This offer has expired</h1>
      <p className="body-medium font-grotesk text-white/70">
        This redemption is no longer valid. If you think this is a mistake, ask
        staff at the venue.
      </p>
    </div>
  );
}
