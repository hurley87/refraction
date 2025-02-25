import Checkpoints from "@/components/checkpoints";

export default async function CheckpointsPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto">
      <img src="/tapphone.png" className="w-2/3 h-auto mx-auto" />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-inktrap uppercase text-black">Your</h1>
        <p
          style={{ lineHeight: "70px" }}
          className="text-white text-7xl font-inktrap uppercase"
        >
          IRL Side Quest
        </p>
        <img src="/info.png" alt="IRL Side Quest" className="w-full h-auto" />
      </div>
      <Checkpoints />
      <div className="flex-auto text-black text-md font-anonymous font-light max-w-4xl mx-auto">
        {`In partnership with Reown and Syndicate, and powered by Refraction's global network of artists, creatives and culture institutions, IRL bridges tangible and virtual worlds, forming the connective tissue between decentralized internet and lived reality.`}
      </div>
      <img
        src="/circles.png"
        alt="Ledger"
        className="w-5/6 h-auto mx-auto my-6"
      />
      <img src="/checkpoint.png" alt="Ledger" className="w-full h-auto" />
    </div>
  );
}
