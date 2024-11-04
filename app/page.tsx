import { Countdown } from "@/components/countdown";
import { Mint } from "@/components/mint";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container flex relative grid-cols-1 h-40 md:h-screen flex-col items-center justify-center md:grid w-full md:grid-cols-2 md:px-0 font-sans">
      <div className="relative h-fit md:h-screen flex flex-col gap-3 bg-zinc-900 p-6 text-white dark:border-r justify-between">
        <div className="relative z-20 flex text-lg">$IRL</div>
        <img src="/nft.jpg" alt="IRL" className="w-auto h-full z-20" />
        <div className="relative z-20 mt-auto">
          <div className="flex justify-between gap-2">
            <footer className="text-sm md:text-lg font-bold">
              Full Launch @ Devcon Bangkok
            </footer>
            <Countdown />
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-5xl font-bold">Welcome to $IRL</h1>
            <p className=" md:text-xl">
              $IRL is your key to unlocking a new way to experience culture.
            </p>
            <p className=" md:text-xl">
              It’s a way to shift the balance and bring creators, venues, and
              audiences closer together. A tool that rewards those who believe
              in the power of real-world experiences, while opening doors to new
              possibilities.
            </p>
          </div>
          <Mint />
          <div className="flex flex-col gap-1 text-sm">
            <Link
              href="https://x.com/RefractionDAO"
              target="_blank"
              className="underline"
            >
              Twitter &#x2197;
            </Link>
            <Link
              href="https://www.instagram.com/refractionfestival"
              target="_blank"
              className="underline"
            >
              Instagram &#x2197;
            </Link>
            <Link
              href="https://warpcast.com/refraction"
              target="_blank"
              className="underline"
            >
              Warpcast &#x2197;
            </Link>
            <Link
              href="https://orb.ac/@refraction"
              target="_blank"
              className="underline"
            >
              Orb &#x2197;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
