import { Countdown } from "@/components/countdown";
import { Mint } from "@/components/mint";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container relative grid-cols-1 h-40 lg:h-screen flex-col items-center justify-center md:grid w-full lg:grid-cols-2 lg:px-0">
      <div className="relative h-full flex-col bg-muted p-6 text-white dark:border-r flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-bold">
          $IRL
        </div>
        <div className="relative z-20 mt-auto">
          <div className="flex flex-col gap-2">
            <Countdown />
            <footer className="text-sm">Full Launch @ Devcon Bangkok</footer>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl lg:text-5xl font-bold">Welcome to $IRL</h1>
            <p className=" lg:text-xl">
              $IRL is your key to unlocking a new way to experience culture.
            </p>
            <p className=" lg:text-xl">
              It’s a way to shift the balance and bring creators, venues, and
              audiences closer together. A tool that rewards those who believe
              in the power of real-world experiences, while opening doors to new
              possibilities.
            </p>
          </div>
          <div>
            <Mint />
          </div>
          <p className="text-xs lg:text-sm italic">
            Claim your free commemorative mint and take an early spot in line
            for the release.
          </p>
          <div className="flex flex-col gap-1 text-sm">
            <Link
              href="https://x.com/RefractionDAO"
              target="_blank"
              className="underline"
            >
              Twitter &#x2197;
            </Link>
            <Link
              href="https://instagram.com/refractingculture"
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
