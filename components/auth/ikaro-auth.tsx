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
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
