"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function ClaimPage() {
  const { authenticated } = usePrivy();
  const router = useRouter();

  // Redirect to appropriate page based on authentication
  useEffect(() => {
    if (authenticated) {
      router.push("/claim/nft");
    } else {
      router.push("/claim/login");
    }
  }, [authenticated, router]);

  return null; // This page just redirects
}
