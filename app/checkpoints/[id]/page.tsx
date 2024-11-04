import Checkpoint from "@/components/checkpoint";
import { notFound } from "next/navigation";

interface CheckpointPageProps {
  params: { id: string };
  searchParams: { iykRef?: string };
}

export default async function CheckpointPage({
  params,
  searchParams,
}: CheckpointPageProps) {
  const id = params.id as `0x${string}`;
  const iykRef = searchParams.iykRef;

  console.log("IYK Reference:", iykRef);

  const NoAccess = () => (
    <div className="absolute top-0 left-0 w-full h-screen flex justify-center items-center text-center z-50">
      No access
    </div>
  );

  if (!iykRef) {
    return <NoAccess />;
  }

  const response = await fetch(`https://api.iyk.app/refs/${iykRef}`);

  console.log("response:", response);

  const { isValidRef } = await response.json();

  console.log("isValidRef:", isValidRef);

  if (!isValidRef) {
    return <NoAccess />;
  }

  return (
    <div>
      <Checkpoint id={id} />
    </div>
  );
}
