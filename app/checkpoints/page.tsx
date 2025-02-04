import Checkpoints from "@/components/checkpoints";
import Image from "next/image";

export default async function CheckpointsPage() {
  return (
    <div className="relative  flex-col items-center justify-center w-full  md:px-0">
      <div className="relative  flex flex-row  bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex">
          <div className="flex-auto text-black text-lg p-6">
            <p className="text-6xl text-left font-inktrap">
              Your IRL Side Quest @ Ledger 106
            </p>
          </div>
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex-auto text-black text-lg p-6">
          <p className="text-4xl text-left font-anonymous">
            Powered by
            </p>
          </div>
      </div>
       <div className="relative  flex flex-row gap-3 bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex-auto text-black text-lg p-6">
          <Image src="/images/refraction_paris.png" alt="refraction paris" width={173} height={30} />    
        </div>
        <div className="flex-auto text-black text-lg p-6">
          <Image src="/images/ledger_paris.png" alt="refraction paris" width={132} height={44} />    
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex justify-center p-6">
          <Checkpoints />
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex justify-center p-6">
          <Image
            src="/images/map.png"
            width={393} 
            height={495} 
            alt="venue map 2nd floor"
          />
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex-auto text-black text-lg text-left max-w-4xl mx-auto p-6">
          <p className="text-base font-anonymous">
            Powered by Refraction's global network of artists, creatives and culture institutions, IRL bridges tangible and virtual worlds, forming the connective tissue between decentralized internet and lived reality.<br/><br/>
            Side Quests are your opportunity to earn points on the IRL protocol ahead of the token launch in June 2025. <br/><br/>In partnership with Ledger, Refraction and IRL touch down @ Ledger 106 during NFT Paris week for a full programme of events. Learn more here:
          </p>
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-[#E8E3DA] p-6 text-BLACK dark:border-r justify-between">
        <div className="flex-auto text-black text-lg text-left max-w-4xl mx-auto p-6">
          <p className="text-base font-anonymous">
            You’ve checked in at ** of 3 Side Quest checkpoints. Head to the lobby, Ledger Stax installation, and the vending machine on the 8th floor to check-in and earn more IRL points
          </p>
        </div>
      </div>

      
    </div>
  );
}
