"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, login, ready, linkEmail } = usePrivy();

  console.log("user", user);

  if (!ready) {
    return <div className="p-6 text-black h-screen">Loading...</div>;
  }

  if (ready && user && !user.email) {
    return (
      <div className="flex justify-center w-fit mx-auto">
        <div className="flex flex-col gap-4">
          <p className="text-white font-inktrap">Link your email for updates</p>
          <div>
            <Button
              className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 justify-center w-full max-w-4xl text-xl font-inktrap py-5"
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
        <img
          src="/ledger/powered-by.png"
          alt="refraction paris"
          className="w-full h-auto max-w-4xl"
        />
        <Button
          className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 justify-center w-full max-w-4xl text-xl font-inktrap py-5"
          onClick={login}
        >
          Get Started
        </Button>
        <div className="relative  flex flex-col gap-3  dark:border-r justify-between">
          <div className="flex-auto text-white text-lg text-left max-w-4xl mx-auto">
            <p className="text-base font-inktrap">
              {`Let’s get started! Click the button below to learn more about the art exhibition and unlock the first checkpoint on your Side Quest. `}
              <br />
              <br />
              Side Quests are your opportunity to earn points on the IRL
              protocol ahead of the token launch in June 2025.
              <br />
              <br />
              {`In partnership with Ledger and powered by Refraction's global network of artists, creatives and culture institutions, IRL bridges tangible and virtual worlds, forming the connective tissue between decentralized internet and lived reality.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
