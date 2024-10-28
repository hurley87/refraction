import Checkpoints from "@/components/checkpoints";

export default async function CheckpointsPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg font-bold">Checkpoints</p>
      <Checkpoints />
    </div>
  );
}
