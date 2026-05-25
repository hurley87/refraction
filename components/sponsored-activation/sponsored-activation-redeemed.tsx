'use client';

type SponsoredActivationRedeemedProps = {
  perkName: string;
};

export function SponsoredActivationRedeemed({
  perkName,
}: SponsoredActivationRedeemedProps) {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/15 p-6 text-center">
        <p className="body-small font-grotesk uppercase tracking-wide text-emerald-200/90">
          Redeemed
        </p>
        <h1 className="mt-2 title2 text-white">Enjoy your perk</h1>
        <p className="mt-3 body-medium font-grotesk text-white/85">
          {perkName} is redeemed. Show this screen if staff asks for
          confirmation.
        </p>
      </div>
    </div>
  );
}
