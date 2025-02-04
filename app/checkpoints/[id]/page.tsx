import Checkpoint from "@/components/checkpoint";

interface CheckpointPageProps {
  params: { id: string };
}

export default async function CheckpointPage({ params }: CheckpointPageProps) {
  const id = params.id as `0x${string}`;

  return (
    <div className=" relative  flex-col items-center justify-center w-full  md:px-0 font-sans">
      <div className="relative  flex flex-row  bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex w-full justify-center p-6">
          <Checkpoint id={id} />
        </div>
      </div>
    </div>
  );
}
