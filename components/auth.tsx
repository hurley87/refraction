"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import Image from "next/image";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, login, ready, linkEmail } = usePrivy();

  if (!ready) {
    return <div className="p-6 text-black h-screen">Loading...</div>;
  }

  console.log(user);

  if (ready && user && !user.email) {
    return (
      <div className="flex justify-center w-fit mx-auto">
        <div className="flex flex-col gap-4">
          <p className="text-black">Link your email for updates</p>
          <div>
            <Button
              className="bg-yellow-500 hover:bg-yellow-400 text-black"
              size="lg"
              onClick={linkEmail}
            >
              Link Email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (ready && !user) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-xl mx-auto pb-6">
        <p className="text-5xl text-left font-inktrap">
          Start Your IRL Side Quest
        </p>
        <p className="text-2xl text-left font-anonymous">Powered by</p>
        <div className="flex items-center gap-6 justify-between">
          <Image
            src="/images/refraction_paris.png"
            alt="refraction paris"
            width={173}
            height={30}
          />
          <Image
            src="/images/ledger_paris.png"
            alt="refraction paris"
            width={132}
            height={44}
          />
        </div>
        <Button
          className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 justify-center w-full max-w-4xl text-xl font-inktrap py-5"
          onClick={login}
        >
          Get Started
        </Button>
        <div className="relative  flex flex-col gap-3 bg-[#E8E3DA] text-BLACK dark:border-r justify-between">
          <div className="flex-auto text-black text-lg text-left max-w-4xl mx-auto">
            <p className="text-base font-anonymous">
              Let’s get started! Click the button below to learn more about the
              art exhibition and unlock the first checkpoint on your Side Quest.
              <br />
              <br />
              Side Quests are your opportunity to earn points on the IRL
              protocol ahead of the token launch in June 2025. <br />
              <br />
              In partnership with Ledger and powered by Refraction's global
              network of artists, creatives and culture institutions, IRL
              bridges tangible and virtual worlds, forming the connective tissue
              between decentralized internet and lived reality.
            </p>
          </div>
        </div>
        <div className="relative  flex flex-col gap-3 bg-[#E8E3DA] text-BLACK dark:border-r justify-between">
          <div className="flex justify-center">
            <img
              src="/images/map.png"
              className="w-full h-auto max-w-4xl"
              width={393}
              height={495}
              alt="venue map 2nd floor"
            />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
