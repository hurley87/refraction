"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ClaimHeader from "@/components/claim-header";
import ClaimFooter from "@/components/claim-footer";
import TransferTokens from "@/components/transfer-tokens";
import MembersSection from "@/components/members-section";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ClaimNFTPage() {
  const { authenticated, user, ready } = usePrivy();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);

  const userAddress = user?.wallet?.address;

  // Redirect to login if not authenticated (only after Privy is ready)
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/claim/login");
    }
  }, [ready, authenticated, router]);

  // Check claim status
  const { data: claimStatus, isLoading } = useQuery({
    queryKey: ["claim-status", userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      const response = await fetch(`/api/claim-nft?userAddress=${userAddress}`);
      if (!response.ok) throw new Error("Failed to fetch claim status");
      return response.json();
    },
    enabled: !!userAddress && authenticated,
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async (address: string) => {
      if (!address) throw new Error("No wallet connected");

      const response = await fetch("/api/claim-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim NFT");
      }

      return data;
    },
    onSuccess: (data, address) => {
      toast.success(data.message || "NFT claimed successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["claim-status", address] });
      router.push("/claim/success");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to claim NFT");
    },
  });

  const handleClaim = async () => {
    if (!userAddress) {
      toast.error("No wallet connected");
      return;
    }
    setClaiming(true);
    try {
      await claimMutation.mutateAsync(userAddress);
    } finally {
      setClaiming(false);
    }
  };

  const hasClaimed = claimStatus?.hasClaimed;
  const tokenBalance = claimStatus?.tokenBalance || "0";

  // Redirect to success page if user has already claimed
  useEffect(() => {
    if (ready && authenticated && hasClaimed) {
      router.push("/claim/success");
    }
  }, [ready, authenticated, hasClaimed, router]);

  // Show loading state while Privy is initializing
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-center text-sm font-grotesk text-[#7D7D7D]">
          Loading...
        </p>
      </div>
    );
  }

  // Redirect if not authenticated (will redirect via useEffect)
  if (!authenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="relative z-10 flex min-h-screen flex-col">
        <header>
          <ClaimHeader />
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-6">

          <div className="relative mx-auto flex w-full max-w-[393px] flex-col items-center gap-16 text-center">
            <div className="space-y-6 pt-[100px]">
                <div className="relative w-[311px] h-[311px] mx-auto rounded-2xl overflow-visible shadow-md bg-white" style={{ transform: "rotate(-2.5deg)" }}>
                  {/* IRL token on the right side, underneath the video */}
                  <div className="absolute top-35 right-0 z-0 translate-x-1/2 -translate-y-1/2">
                    <div className="w-[97px] h-[89px]">
                      <img
                        src="/wct/irl-token.svg"
                        alt="IRL Token"
                        width={97}
                        height={89}
                        className="w-[97px] h-[89px] object-contain drop-shadow-lg"
                        draggable={false}
                      />
                    </div>
                  </div>
                  {/* Background Video matching nft.svg dimensions - positioned on top */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden z-10">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        width: "311px",
                        height: "280px",
                      }}
                    >
                      <source src="/wct/background.mp4" type="video/mp4" />
                    </video>
                  </div>
                  {/* WCT logo on bottom left edge, on top of video */}
                  <div className="absolute bottom-0 left-0 z-20 -translate-x-1/2 translate-y-1/2">
                    <div className="w-32 h-32">
                      <img
                        src="/wct/walletconnect-logo.png"
                        alt="WCT"
                        className="w-full h-full object-contain drop-shadow-lg"
                        draggable={false}
                      />
                    </div>
                  </div>
                {/* Optional: transparent overlay for visual polish */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-black/5 pointer-events-none" />
              </div>
              <div className="h-[50px]" aria-hidden="true"></div>
              <p
                className="mx-auto text-center"
                style={{
                  color: "var(--UI-OffBlack, #131313)",
                  textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                  fontFamily: '"Pleasure Variable Trial"',
                  fontSize: "25px",
                  fontStyle: "normal",
                  fontWeight: 500,
                  lineHeight: "28px",
                  letterSpacing: "-0.5px",
                }}
              >
                Claim Your Digital Artwork By
              </p>
              <h1
                className="mx-auto text-center"
                style={{
                  width: "375px",
                  color: "var(--UI-OffBlack, #131313)",
                  textTransform: "uppercase",
                  textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                  fontFamily: '"Inktrap"',
                  fontSize: "48px",
                  fontStyle: "normal",
                  fontWeight: 700,
                  lineHeight: "48px",
                  letterSpacing: "-3.84px",
                }}
              >
                JUAN PEDRO VALLEJO
              </h1>
              <p
                className="mx-auto text-center font-inktrap"
                style={{
                  color: "var(--UI-OffBlack, #131313)",
                  textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                  fontFamily: '"Pleasure Variable Trial"',
                  fontSize: "25px",
                  fontStyle: "normal",
                  fontWeight: 500,
                  lineHeight: "28px",
                  letterSpacing: "-0.5px",
                }}
              >
                As Well As
              </p>
              <h1
                className="mx-auto text-center "
                style={{
                  width: "375px",
                  color: "var(--UI-OffBlack, #131313)",
                  textTransform: "uppercase",
                  textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                  fontFamily: '"Inktrap"',
                  fontSize: "48px",
                  fontStyle: "normal",
                  fontWeight: 700,
                  lineHeight: "48px",
                  letterSpacing: "-3.84px",
                }}
              >
                $WCT + IRL Points
              </h1>

              <div className="space-y-4">
                {!hasClaimed ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleClaim}
                      disabled={claiming || claimMutation.isPending}
                      className="flex w-[260px] h-12 py-2 pl-4 pr-1 justify-between items-center shrink-0 rounded-full bg-[#307FE2] font-pleasure text-white transition hover:bg-[#307FE2]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 z-10"
                    >
                      <span
                        style={{
                          color: "var(--UI-White, #FFF)",
                          fontFamily: '"Pleasure"',
                          fontSize: "16px",
                          fontStyle: "normal",
                          fontWeight: 500,
                          lineHeight: "16px",
                          letterSpacing: "-1.28px",
                        }}
                      >
                        {claiming || claimMutation.isPending
                          ? "Claiming..."
                          : "Collect Your Rewards"}
                      </span>
                      <Image
                        src="/wct/walletconnect-button.svg"
                        alt="WalletConnect Button"
                        width={38}
                        height={38}
                        className="h-[38px] w-[38px] z-20"
                      />
                    </button>
                 
                  </div>
                ) : null}

                {isLoading && (
                  <p className="text-center text-sm font-grotesk text-[#7D7D7D]">
                    Checking claim status...
                  </p>
                )}

                {hasClaimed && (
                  <div className="space-y-4">
                    <TransferTokens
                      tokenBalance={tokenBalance}
                      onTransferComplete={() => {
                        queryClient.invalidateQueries({
                          queryKey: ["claim-status", userAddress],
                        });
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex w-full max-w-[375px] flex-col items-center gap-4 self-stretch px-4 pt-[34px]">
               
                <p
                  className="mx-auto text-center"
                  style={{
                    color: "var(--Dark-Tint-80, #4F4F4F)",
                    textAlign: "center",
                    fontFamily: '"ABC Monument Grotesk Semi-Mono Unlicensed Trial"',
                    fontSize: "13px",
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: "20px",
                    letterSpacing: "-0.26px",
                  }}
                >
                  Available exclusively to WalletCon attendees.
                </p>
                <div
                  className="self-stretch rounded-lg overflow-hidden"
                  style={{
                    height: "225px",
                    aspectRatio: "361/225",
                    borderRadius: "8px",
                    boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <source src="/wct/background.mp4" type="video/mp4" />
                  </video>
                </div>
                <p
                   className="text-left uppercase self-stretch"
                   style={{
                     color: "var(--Dark-Tint-60, #7D7D7D)",
                     fontFamily: '"ABC Monument Grotesk Semi-Mono Unlicensed Trial"',
                     fontSize: "11px",
                     fontStyle: "normal",
                     fontWeight: 500,
                     lineHeight: "16px",
                     letterSpacing: "0.44px",
                     textTransform: "uppercase",
                   }}
                >
                   ABOUT THE ARTIST
                 </p>
                 <p
                   className="text-left self-stretch"
                   style={{
                     color: "var(--Dark-Tint-100, #313131)",
                     fontFamily: '"ABC Monument Grotesk Semi-Mono Unlicensed Trial"',
                     fontSize: "16px",
                     fontStyle: "normal",
                     fontWeight: 400,
                     lineHeight: "22px",
                     letterSpacing: "-0.48px",
                   }}
                  >
                   Juan Pedro Vallejo is an Argentinean artist working with generative systems and code.
                   <br />
                   <br />
                   Vallejo considers the screen a material in his practice, sculpting systems through unique possibilities and permutations.
                 </p>
                 <button
                   type="button"
                   className="flex h-7 items-center gap-2 rounded-full self-start"
                   style={{
                     padding: "4px 16px 4px 8px",
                     background: "var(--Dark-Tint-20, #EDEDED)",
                   }}
                 >
                   <span
                     style={{
                       color: "var(--UI-OffBlack, #131313)",
                       fontFamily: '"ABC-Monument-Grotesk"',
                       fontSize: "11px",
                       fontStyle: "normal",
                       fontWeight: 500,
                       lineHeight: "16px",
                       letterSpacing: "0.44px",
                       textTransform: "uppercase",
                     }}
                   >
                     BIO
                    </span>
                    <Image
                      src="/arrow-diag-right.svg"
                      alt="arrow"
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                   </button>
                 <div
                   className="w-full"
                   style={{
                     height: "66px",
                   }}
                 />
                 <div
                   className="rounded-2xl overflow-hidden"
                   style={{
                     width: "361px",
                     height: "190px",
                     aspectRatio: "19/10",
                     borderRadius: "16px",
                     background: "url('/wct/walletconnect-banner.svg') lightgray 50% / cover no-repeat",
                   }}
                 >
                   <Image
                     src="/wct/walletconnect-banner.svg"
                     alt="WalletConnect Banner"
                     width={361}
                     height={190}
                     className="w-full h-full object-cover"
                   />
                 </div>
                  <p
                    className="text-left uppercase self-stretch"
                    style={{
                      color: "var(--Dark-Tint-60, #7D7D7D)",
                      fontFamily: '"ABC-Monument-Grotesk"',
                      fontSize: "11px",
                      fontStyle: "normal",
                      fontWeight: 500,
                      lineHeight: "16px",
                      letterSpacing: "0.44px",
                      textTransform: "uppercase",
                    }}
                 >
                    ABOUT WALLETCONNECT
                  </p>
                  <p
                    className="text-left self-stretch"
                    style={{
                      color: "var(--Dark-Tint-100, #313131)",
                      fontFamily: '"ABC-Monument-Grotesk"',
                      fontSize: "16px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      lineHeight: "22px",
                      letterSpacing: "-0.48px",
                    }}
                  >
                    WCT is the native token of the WalletConnect Network and secures the network via staking, rewards, fees, and governance.
                  </p>
                  <button
                   type="button"
                   className="flex h-7 items-center gap-2 rounded-full self-start"
                   style={{
                     padding: "4px 16px 4px 8px",
                     background: "var(--Dark-Tint-20, #EDEDED)",
                   }}
                 >
                   <span
                     style={{
                       color: "var(--UI-OffBlack, #131313)",
                       fontFamily: '"ABC-Monument-Grotesk"',
                       fontSize: "11px",
                       fontStyle: "normal",
                       fontWeight: 500,
                       lineHeight: "16px",
                       letterSpacing: "0.44px",
                       textTransform: "uppercase",
                     }}
                   >
                     LEARN MORE
                    </span>
                    <Image
                      src="/arrow-diag-right.svg"
                      alt="arrow"
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                   </button>
                  <div
                   className="w-full"
                   style={{
                     height: "66px",
                   }}
                 />
                    <div
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                      width: "361px",
                      height: "190px",
                      aspectRatio: "19/10",
                      borderRadius: "16px",
                      background: "url('/wct/irl-card.svg') lightgray 50% / cover no-repeat",
                    }}
                  >
                    <Image
                      src="/wct/irl-card.svg"
                      alt="IRL Banner"
                      width={361}
                      height={190}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image
                        src="/wct/irl-logo-2.svg"
                        alt="IRL Logo"
                        width={124}
                        height={114}
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <p
                    className="text-left uppercase self-stretch"
                    style={{
                      color: "var(--Dark-Tint-60, #7D7D7D)",
                      fontFamily: '"ABC-Monument-Grotesk"',
                      fontSize: "11px",
                      fontStyle: "normal",
                      fontWeight: 500,
                      lineHeight: "16px",
                      letterSpacing: "0.44px",
                      textTransform: "uppercase",
                    }}
                 >
                    ABOUT IRL
                  </p>
                   <p
                    className="text-left self-stretch"
                    style={{
                      color: "var(--Dark-Tint-100, #313131)",
                      fontFamily: '"ABC-Monument-Grotesk"',
                      fontSize: "16px",
                      fontStyle: "normal",
                      fontWeight: 400,
                      lineHeight: "22px",
                      letterSpacing: "-0.48px",
                    }}
                  >
                    The IRL ecosystem reimagines the experience economy through its blockchain, token, and protocol, establishing a decentralized foundation for a new era of cultural participation. 
                  </p>
                   <a
                   href="https://irl.energy"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex h-7 items-center gap-2 rounded-full self-start"
                   style={{
                     padding: "4px 16px 4px 8px",
                     background: "var(--Dark-Tint-20, #EDEDED)",
                     textDecoration: "none",
                   }}
                 >
                   <span
                     style={{
                       color: "var(--UI-OffBlack, #131313)",
                       fontFamily: '"ABC-Monument-Grotesk"',
                       fontSize: "11px",
                       fontStyle: "normal",
                       fontWeight: 500,
                       lineHeight: "16px",
                       letterSpacing: "0.44px",
                       textTransform: "uppercase",
                     }}
                   >
                     GO TO IRL.ENERGY
                    </span>
                    <Image
                      src="/arrow-diag-right.svg"
                      alt="arrow"
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                   </a>
                   <div
                   className="w-full"
                   style={{
                     height: "66px",
                   }}
                 />
              </div>
            </div>

            <MembersSection variant="left-aligned" colorScheme="light" />
          </div>
        </main>

        <ClaimFooter />
      </div>
    </div>
  );
}

