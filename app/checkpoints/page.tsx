import Checkpoints from "@/components/checkpoints";
import Image from "next/image";

export default async function CheckpointsPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto pb-6">
      <div className="flex gap-6 justify-center">
        <Image
          src="/images/Mask group.png"
          alt="mask group"
          width={423}
          height={238}
        />
      </div>
      <div className="flex gap-6 justify-center">
        <Image
          src="/images/Frame-3-logged-in.png"
          alt="start your IRL side quest"
          width={361}
          height={377}
        />
      </div>
      <Checkpoints />
      <div className="relative  flex flex-col gap-3 bg-black text-white dark:border-r justify-between">
        <div className="flex justify-center">
          <img
            src="/images/maps.png"
            className="w-full h-auto max-w-4xl"
            width={357}
            height={379}
            alt="venue map 2nd floor"
          />
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-black dark:border-r justify-between">
        <div className="flex-auto text-white text-lg font-hmalpha text-left max-w-4xl mx-auto">
          <p className="text-base font-hmalpha">
            {`Powered by Refraction's global network of artists, creatives and
            culture institutions, IRL bridges tangible and virtual worlds,
            forming the connective tissue between decentralized internet and
            lived reality.`}
            <br />
            <br />
            Side Quests are your opportunity to earn points on the IRL protocol
            ahead of the token launch in June 2025. <br />
            <br />
            In partnership with Ledger, Refraction and IRL touch down @ Ledger
            106 during NFT Paris week for a full programme of events. Learn more
            here:
          </p>
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-black text-white dark:border-r justify-between">
        <div className="flex-auto text-white text-lg text-left max-w-4xl mx-auto">
          <p className="text-base font-hmalpha">
            {`Head to the lobby, Ledger Stax installation, and the vending machine on the 8th
            floor to check-in and earn more IRL points.`}
          </p>
        </div>
      </div>
    </div>
  );
}
