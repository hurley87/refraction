import Checkpoints from "@/components/checkpoints";
import Image from "next/image";

export default async function CheckpointsPage() {
  return (
    <div className=" relative  flex-col items-center justify-center w-full  md:px-0 font-sans">
      <div className="relative  flex flex-row  bg-gradient-to-r from-orange-600 from-10% via-rose-300 via-90% to-yellow-300 to-100% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex">
          <div className="flex-auto text-black text-lg p-6">
            <p className="text-6xl text-center">
              Earn rewards for supporting culture
            </p>
          </div>
          <div className="flex justify-center">
          <Image 
            src="/images/$IRL_SYMBOLS_BLACK_2.svg" 
            width={300} 
            height={300} 
            alt="symbols"
          />
        </div>
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-orange-600 from-10%  to-red-600 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex items-center p-6">
          <div className="flex-none">
            <Image
              src="/images/$IRL_PRIMARY LOGO ICON_BLACK.svg"
              alt="IRL"
              width={100}
              height={100}
              className="rotate-90"
            />
          </div>
          <div className="flex-auto text-black text-lg4 p-6">
            <p>
              A token that fuels creativity and experiences around the world.
              Earn $IRL to unlock unique experiences and rewards, both online
              and offline.
            </p>
          </div>
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-red-600 from-40% to-green-600 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex-auto text-black text-lg">
          <p className="text-lg">
            TRANSFORMS PARTICIPATION INTO A TANGIBLE ASSET, FOSTERING DEEPER
            ENGAGEMENT AND INCENTIVIZING CONTRIBUTIONS.
          </p>
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-red-600 from-10% to-green-600 to-70% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex-auto text-black text-lg text-center max-w-4xl mx-auto p-6">
          <p className="text-base">
            $IRL Side Quests let you dive deeper into the experience, earn
            points, discover new art, and unlock rewards across each checkpoint.
            Tap your phone to the first checkpoint to get started.
          </p>
        </div>
        <div className="flex-auto text-black text-lg text-center max-w-4xl mx-auto p-6">
          <Image 
            src="/images/$IRL_SYMBOLS_BLACK_4.svg" 
            width={250} 
            height={250} 
            alt="symbols"
          />
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-yellow-300 from-10% via-rose-300 via-30% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex justify-center p-6">
          <Checkpoints />
        </div>
      </div>
    </div>
  );
}
