import Checkpoints from "@/components/checkpoints";
import Image from "next/image";
  const checkpointNames = [
    "Entrance checkpoint",
    "Bar checkpoint",
    "Ten by RARI exhibition checkpoint",
    "Merch stand checkpoint",
    "Bonus! Dancefloor checkpoint",
  ];

  const checkins = [false, false, false, false, false];

export default async function CheckpointsPage() {
  return (
    <div className="relative  flex-col items-center justify-center w-full  md:px-0 font-sans">
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-yellow-300 from-10% via-rose-300 via-30% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex justify-center p-6">
          <Checkpoints />
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-yellow-300 from-10% via-rose-300 via-30% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex justify-center p-6">
            <div className="flex flex-col text-xl gap-3 text-black">
              {checkins?.map((checkin: boolean, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z"
                      />
                    </svg>
                  
                  <p>{checkpointNames[index]}</p>
                </div>
              ))}
            </div>
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-yellow-300 from-10% via-rose-300 via-30% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex justify-center p-6">
          <Image
            src="/images/$IRL_VENUE MAP_2ND FLOOR_TRANSPARENT.png"
            width={1000}
            height={1000}
            alt="venue map 2nd floor"
          />
        </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-yellow-300 from-10% via-rose-300 via-30% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex justify-center p-6">
          <Image
            src="/images/$IRL_VENUE MAP_3RD FLOOR_TRANSPARENT-2.png"
            width={1000}
            height={1000}
            alt="venue map 3rd floor"
          />
        </div>
      </div>
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
    </div>
  );
}
