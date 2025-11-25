import SolanaCheckpoint from "@/components/solana-checkpoint";

interface SolanaCheckinPageProps {
  params: { id: string };
}

export default async function SolanaCheckinPage({
  params,
}: SolanaCheckinPageProps) {
  const id = params.id;

  return (
    <div className="flex flex-col w-full justify-center font-sans">
      <SolanaCheckpoint id={id} />
    </div>
  );
}

