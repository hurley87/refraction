"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ClaimHeader from "@/components/claim-header";
import ClaimFooter from "@/components/claim-footer";
import { usePrivy } from "@privy-io/react-auth";

export default function ClaimLoginPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  // Redirect to login success page if already authenticated (only after Privy is ready)
  useEffect(() => {
    if (ready && authenticated) {
      router.push("/claim/login/success");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="relative z-10 flex min-h-screen flex-col">
        <header>
          <ClaimHeader />
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-6">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 hidden md:block"
            style={{
              width: "1909px",
              height: "1192px",
              aspectRatio: "1909 / 1192",
              flexShrink: 0,
              background:
                "linear-gradient(0deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.72) 100%)",
              filter: "blur(6px)",
              transform: "translate(-50%, -55%) rotate(90deg) scale(1.45)",
              transformOrigin: "center",
              objectFit: "cover",
            }}
          >
            <source src="/wct/background.mp4" type="video/mp4" />
          </video>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 block md:hidden"
            style={{
              width: "1909px",
              height: "1192px",
              aspectRatio: "1909 / 1192",
              flexShrink: 0,
              background:
                "linear-gradient(0deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.72) 100%)",
              filter: "blur(6px)",
              transform: "translate(-50%, -45%) rotate(90deg) scale(1.6)",
              transformOrigin: "center",
              objectFit: "cover",
            }}
          >
            <source src="/wct/background.mp4" type="video/mp4" />
          </video>
          <div className="relative mx-auto flex w-full max-w-[393px] flex-col items-center gap-16 text-center">
            <div className="space-y-6 pt-[100px]">
              <p
                className="mx-auto text-center"
                style={{
                  color: "var(--UI-OffBlack, #131313)",
                  textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                  fontFamily: '"Pleasure"',
                  fontSize: "25px",
                  fontStyle: "normal",
                  fontWeight: 500,
                  lineHeight: "28px",
                  letterSpacing: "-0.5px",
                }}
              >
                Welcome to
                <br /> WalletCon Buenos Aires
              </p>
              <div
                className="mx-auto text-center font-inktrap"
                style={{
                  color: "var(--UI-OffBlack, #131313)",
                  textAlign: "center",
                  textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                  
                  fontSize: "48px",
                  fontStyle: "normal",
                  fontWeight: 700,
                  lineHeight: "48px",
                  letterSpacing: "-3.84px",
                  textTransform: "uppercase",
                }}
              >
                Claim Your Rewards
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={login}
                  className="flex w-[260px] h-12 py-2 pl-4 pr-1 justify-between items-center shrink-0 rounded-full bg-[#307FE2]  text-white transition hover:bg-[#307FE2]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black font-pleasure"
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
                    Login With Email
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

              <div className="flex w-full max-w-[375px] flex-col items-center gap-4 self-stretch px-4 pt-[34px]">
                <span className="body-small font-grotesk text-black">
                  POWERED BY
                </span>
                <Image
                  src="/logos/walletconnect white 1.svg"
                  alt="WalletConnect"
                  width={221}
                  height={24}
                  className="mx-auto"
                  style={{
                    width: "221px",
                    height: "24px",
                    aspectRatio: "221 / 24",
                  }}
                />
              
                <Image
                  src="/refraction-black.svg"
                  alt="Refraction"
                  width={200}
                  height={40}
                  className="h-auto w-[160px]"
                />
              </div>
            </div>

            
          </div>
        </main>

        <ClaimFooter />
      </div>
    </div>
  );
}

