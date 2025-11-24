"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ClaimHeader from "@/components/claim-header";
import Footer from "@/components/footer";
import TransferTokens from "@/components/transfer-tokens";
import MembersSection from "@/components/members-section";
import ExportWalletButton from "@/components/export-wallet-button";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ClaimSuccessPage() {
  const { authenticated, user } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();

  const userAddress = user?.wallet?.address;

  // Redirect if not authenticated or if user hasn't claimed
  useEffect(() => {
    if (!authenticated) {
      router.push("/claim");
      return;
    }
  }, [authenticated, router]);
 
  // Check claim status
  const { data: claimStatus, isLoading } = useQuery({
    queryKey: ["claim-status", userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      const response = await fetch(`/api/claim-nft?userAddress=${userAddress}`);
      if (!response.ok) throw new Error("Failed to fetch claim status");
      return response.json();
    },
    enabled: !!userAddress,
  });

  // Redirect if user hasn't claimed yet
  useEffect(() => {
    if (claimStatus && !claimStatus.hasClaimed) {
      router.push("/claim");
    }
  }, [claimStatus, router]);

  
  const tokenBalance = claimStatus?.tokenBalance || "0";

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#131313]">
        <div className="relative z-10 flex min-h-screen flex-col">
          <header>
            <ClaimHeader />
          </header>
          <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-6">
            <p className="text-center text-sm font-grotesk text-[#7D7D7D]">
              Loading...
            </p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131313]">
      <div className="relative z-10 flex min-h-screen flex-col">
      

        <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-6">
          <div className="relative mx-auto flex w-full max-w-[393px] flex-col items-center gap-16 text-center">
            <div className="space-y-6 pt-[100px]">
              <div className="flex w-full max-w-[375px] flex-col items-center gap-4 self-stretch px-4 pt-[34px]">
                <Image
                  src="/wct/final-art.jpg"
                  alt="Claimed artwork"
                  width={375}
                  height={375}
                  className="mx-auto w-full max-w-[375px] object-contain"
                  unoptimized
                />
                <div className="h-[50px]" aria-hidden="true"></div>
                <h2
                  className="text-center text-white font-pleasure font-bold"
                  style={{
                    textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                    fontSize: "39px",
                    lineHeight: "40px",
                    letterSpacing: "-2.34px",
                  }}
                >
                  CLAIM SUCCESSFUL
                </h2>
                <div className="h-[50px]" aria-hidden="true"></div>
                <p
                  className="text-center text-white font-grotesk"
                  style={{
                    fontSize: "16px",
                    fontWeight: 400,
                    lineHeight: "22px",
                    letterSpacing: "-0.48px",
                  }}
                >
                  You&apos;ve claimed your $WCT, IRL points, and a special edition artwork by Juan Pedro Vallejo. Make sure to grab your
                  limited edition artwork print at the checkpoint, and enjoy the
                  rest of the your WalletCon!
                  <br />
                  <br />
                  See you IRL again soon.
                </p>
                <TransferTokens
                  tokenBalance={tokenBalance}
                  onTransferComplete={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["claim-status", userAddress],
                    });
                  }}
                  buttonClassName="flex w-full h-10 items-center justify-center gap-4 rounded-full bg-[#EDEDED] px-4 py-2 border-none text-black font-grotesk text-sm hover:bg-gray-100 transition"
                  buttonFontFamily='"Pleasure"'
                  buttonText="Send your $WCT to your wallet"
                />
                <ExportWalletButton className="flex h-10 w-full items-center justify-center gap-4 rounded-full bg-[#EDEDED] px-4 py-2 font-pleasure text-black transition hover:bg-gray-100" />
                {userAddress && (
                  <a
                    href={`https://basescan.org/address/${userAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full h-10 items-center justify-center gap-4 rounded-full bg-[#EDEDED] px-4 py-2 font-pleasure"
                  >
                    View on Basescan
                    
                  </a>
                )}
               
                <a
                  href="https://irl.energy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full h-10 items-center justify-center gap-4 rounded-full bg-[#EDEDED] px-4 py-2 font-pleasure"
                >
                  Visit IRL.Energy
                 
                </a>
              </div>
            </div>

            {/* Members Section */}
            <MembersSection variant="centered" />

          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

