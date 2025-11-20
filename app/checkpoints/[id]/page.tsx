import Checkpoint from "@/components/checkpoint";

interface CheckpointPageProps {
  params: { id: string };
}

export default async function CheckpointPage({ params }: CheckpointPageProps) {
  const id = params.id as `0x${string}`;

  return (
    <div className="flex flex-col w-full justify-centerfont-sans  ">
      <Checkpoint id={id} />
    </div>
  );
}
