import Partners from "@/components/partners";

export default async function IkaroMintPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <div className="w-full max-w-7xl px-4">
        <Partners />
      </div>
    </div>
  );
}