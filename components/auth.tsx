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
    return (
      <div className="flex justify-center items text-center w-full h-screen font-inktrap text-2xl pt-10">
        Loading...
      </div>
    );
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
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-black text-xl font-inktrap uppercase">
            CHECK IN TO
          </h1>
          <p
            style={{ lineHeight: "60px" }}
            className="text-black text-6xl font-inktrap uppercase leading-2.5"
          >
            EARN POINTS & REWARDS
          </p>
          <h1 className="text-black text-3xl font-inktrap uppercase">
            ON THE IRL NETWORK
          </h1>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <p className="text-black text-sm font-inktrap ">Powered by</p>
            <img
              src="/refraction.png"
              alt="Refraction"
              className="w-auto h-[16px]"
            />
          </div>
          <img
            src="/bhx.png"
            alt="IRL Side Quest"
            className="w-[46px] h-[46px]"
          />
        </div>
        <div className="flex flex-col gap-3  justify-between">
          <div className="flex flex-col gap-3 justify-between py-10">
            <div
              style={{
                backgroundImage: "url('/checkpoint.svg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              className="flex flex-col gap-3 justify-between h-screen p-4"
            >
              <p
                style={{ lineHeight: "40px" }}
                className="text-[#FFE600] text-3xl font-inktrap uppercase leading-2.5 rwr text-right"
              >
                BE THE FIRST TO ACCESS THE IRL AIRDROP
              </p>
              <p className="text-base font-anonymous text-[#FFE600]">
                {`Powered by Refraction, the IRL network uses blockchain technology to reward audiences, artists and fans for creating and engaging with culture.`}
                <br />
                <br />
                Check in to earn IRL, gain exclusive access to experiences and
                rewards, and help build the new creative economy.
              </p>
            </div>
          </div>
          <div>
            <h1 className="text-black text-4xl text-center font-inktrap uppercase">
              CLAIM
            </h1>
            <p className="text-black text-2xl font-inktrap uppercase leading-2.5 text-center">
              YOUR POINTS
            </p>
          </div>
          <Button
            className="bg-white text-black rounded-lg hover:bg-white/80 justify-center w-full max-w-4xl text-xl font-inktrap uppercase my-4"
            onClick={login}
          >
            CHECK IN
          </Button>
          <img
            src="/irlfooterlogo.svg"
            alt="irl"
            className="w-full h-auto mt-10"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
