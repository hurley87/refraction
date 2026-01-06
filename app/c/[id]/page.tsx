import { notFound } from "next/navigation";
import { getActiveCheckpointById } from "@/lib/db/checkpoints";
import UnifiedCheckpoint from "@/components/checkpoint/unified-checkpoint";

interface CheckpointPageProps {
  params: { id: string };
}

export default async function CheckpointPage({ params }: CheckpointPageProps) {
  const checkpoint = await getActiveCheckpointById(params.id);

  if (!checkpoint) {
    notFound();
  }

  return (
    <div className="flex flex-col w-full justify-center font-sans">
      <UnifiedCheckpoint checkpoint={checkpoint} />
    </div>
  );
}
