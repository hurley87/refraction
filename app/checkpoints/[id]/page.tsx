import Checkpoint from "@/components/checkpoint";

interface CheckpointPageProps {
  params: { id: string };
}

export default async function CheckpointPage({ params }: CheckpointPageProps) {
  const id = params.id as `0x${string}`;

  return (
    <div>
      <Checkpoint id={id} />
    </div>
  );
}
