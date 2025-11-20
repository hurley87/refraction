import Checkpoint from "@/components/checkpoint";
import { redirect } from "next/navigation";

interface CheckpointPageProps {
  params: { id: string };
}

export default async function CheckpointPage({ params }: CheckpointPageProps) {
  if (params.id === "1") {
    redirect("/claim/login");
  }

  const id = params.id as `0x${string}`;

  return (
    <div className="flex flex-col w-full justify-centerfont-sans  ">
      <Checkpoint id={id} />
    </div>
  );
}
