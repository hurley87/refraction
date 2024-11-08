"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, login, ready, linkEmail } = usePrivy();

  if (!ready) {
    return <div className="h-full p-6 text-black">Loading...</div>;
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
      <div className="flex justify-center w-fit mx-auto">
        <div className="flex flex-col gap-4">
          <p className="text-black">
            Welcome to your first IRL Side Quest. <br /> There are 5 checkpoints
            to complete.
          </p>
          <Button
            className="text-white rounded-lg hover:bg-slate-800 justify-center"
            onClick={login}
          >
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
