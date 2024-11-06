import Checkpoint from "@/components/checkpoint";

interface CheckpointPageProps {
  params: { id: string };
  // searchParams: { iykRef?: string };
}

export default async function CheckpointPage({
  params,
}: // searchParams,
CheckpointPageProps) {
  const id = params.id as `0x${string}`;
  // const iykRef = searchParams.iykRef;

  // const NoAccess = () => (
  //   <div className="absolute top-0 left-0 w-full h-screen flex justify-center items-center text-center z-50">
  //     No access
  //   </div>
  // );

  // if (!iykRef) {
  //   return <NoAccess />;
  // }

  // const response = await fetch(`https://api.iyk.app/refs/${iykRef}`);

  // const { isValidRef } = await response.json();

  // if (!isValidRef) {
  //   return <NoAccess />;
  // }

  return (
    <div className=" relative  flex-col items-center justify-center w-full  md:px-0 font-sans">
      <div className="relative  flex flex-row  bg-gradient-to-r from-orange-600 from-10% via-rose-300 via-90% to-yellow-300 to-100% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex p-6">
          <Checkpoint id={id} />
        </div>
      </div>
    </div>
  );
}
