"use client";

import { usePrivy } from "@privy-io/react-auth";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { ready  } = usePrivy();

  //console.log("user", user);

  if (!ready) {
    return (
      <div className="flex justify-center items text-center w-full h-screen font-inktrap text-2xl pt-10">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
