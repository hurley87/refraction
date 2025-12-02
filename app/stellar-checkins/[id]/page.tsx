import StellarCheckpoint from "@/components/stellar-checkpoint";

interface StellarCheckinPageProps {
  params: { id: string };
}

export default async function StellarCheckinPage({
  params,
}: StellarCheckinPageProps) {
  const id = params.id;

  return (
    <div className="flex flex-col w-full justify-center font-sans">
      <StellarCheckpoint id={id} />
    </div>
  );
}


