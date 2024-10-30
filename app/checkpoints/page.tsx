import Checkpoints from "@/components/checkpoints";
import Link from "next/link";
import Image from "next/image";

export default async function CheckpointsPage() {
  return (
    <div className="container relative h-40 md:h-screen flex-col items-center justify-center md:grid w-full  md:px-0 font-sans">
      <div className="relative   flex flex-col gap-3 bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex ">
          <div className="flex-none">
            <img src="/images/$IRL_PRIMARY LOGO_BLACK.svg" alt="IRL" width={100} height={100} />
          </div>
          <div className="flex-auto wd-6 ">
            &nbsp;
          </div>

          <div className="flex flex-col w-64 gap-1 text-sm text-right text-black ">
            <Link
              href="https://x.com/RefractionDAO"
              target="_blank"
              className="nounderline"
            >
              HOME &#x2197;
            </Link>
            <Link
              href="https://www.instagram.com/refractionfestival"
              target="_blank"
              className="nounderline"
            >
              OUR STORY &#x2197;
            </Link>
            <Link
              href="https://warpcast.com/refraction"
              target="_blank"
              className="nounderline"
            >
              UPCOMING EVENTS &#x2197;
            </Link>
            <Link
              href="https://orb.ac/@refraction"
              target="_blank"
              className="nounderline"
            >
              CONTACTS &#x2197;
            </Link>
          
          </div>
        </div>
        
        
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-orange-600 from-10% via-rose-300 via-90% to-yellow-300 to-100% p-6 text-BLACK dark:border-r justify-between">
          <div className="flex-auto text-black text-lg"><p className="text-4xl">RECOGNIZING AND REWARDING CULTURE.</p></div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-orange-600 from-10%  to-red-600 to-90% p-6 text-BLACK dark:border-r justify-between">
        <div className="flex ">
         <div className="flex-none">
            <img src="/images/$IRL_PRIMARY LOGO ICON_BLACK.svg" alt="IRL" width={100} height={100} className="rotate-90" />
          </div>
         <div className="flex-auto text-black text-lg">
          <p>OFFERS A NOVEL WAY TO ENSURE THAT EVERY PARTICIPANT -- FROM CREATORS TO CONSUMERS -- RECEIVES DUE RECOGNITION AND REWARDS.</p></div>
          </div>
      </div>
      <div className="relative  flex flex-col gap-3 bg-gradient-to-r from-red-600 from-40% to-green-600 to-90% p-6 text-BLACK dark:border-r justify-between">
          <div className="flex-auto text-black text-lg"><p className="text-lg">TRANSFORMS PARTICIPATION INTO A TANGIBLE ASSET, FOSTERING DEEPER ENGAGEMENT AND INCENTIVIZING CONTRIBUTIONS.</p></div>
      </div>
      

    </div>

  );
}
