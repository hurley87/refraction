"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, login, ready, linkEmail } = usePrivy();

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
      <div className="flex flex-col gap-6 w-full max-w-xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl font-inktrap uppercase">
            Start Your
          </h1>
          <p
            style={{ lineHeight: "80px" }}
            className="text-white text-8xl font-inktrap uppercase leading-2.5"
          >
            IRL Side Quest
          </p>
        </div>
        <img src="/info.png" alt="IRL Side Quest" className="w-full h-auto" />
        <Button
          className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 justify-center w-full max-w-4xl text-xl font-inktrap uppercases"
          onClick={login}
        >
          Email Sign-In
        </Button>
        <div className="relative  flex flex-col gap-3  dark:border-r justify-between">
          <div className="flex-auto text-black font-light text-lg text-left max-w-4xl mx-auto">
            <p className="text-base font-inktrap">
              {`In partnership with Reown and Syndicate, and powered by Refraction's global network of artists, creatives and culture institutions, IRL bridges tangible and virtual worlds, forming the connective tissue between decentralized internet and lived reality.`}
              <br />
              <br />
              Let’s get started! Click the button below to login and unlock the
              first checkpoint on your Side Quest, earning you $WCT and IRL
              points on the Syndicate powered IRL protocol.
            </p>
          </div>
          <img src="/checkpoint.png" alt="Ledger" className="w-full h-auto" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
