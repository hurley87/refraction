import Image from "next/image";
import ClaimHeader from "@/components/claim-header";
import ClaimFooter from "@/components/claim-footer";

export default function ClaimPage() {
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
                  fontFamily: '"Pleasure Variable Trial"',
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
              <h1
                className="mx-auto text-center"
                style={{
                  width: "375px",
                  color: "var(--UI-OffBlack, #131313)",
                  textTransform: "uppercase",
                  textShadow: "0 0 16px rgba(255, 255, 255, 0.70)",
                  fontFamily: '"Pleasure Variable Trial"',
                  fontSize: "48px",
                  fontStyle: "normal",
                  fontWeight: 700,
                  lineHeight: "48px",
                  letterSpacing: "-3.84px",
                }}
              >
                Claim Your Rewards
              </h1>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="flex h-12 w-full max-w-[311px] items-center justify-between rounded-full bg-[#313131] px-4 py-2 font-pleasure text-white transition hover:bg-[#313131]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  <span>Login With Email</span>
                  <Image
                    src="/white-arrow-right.svg"
                    alt="arrow-right"
                    width={20}
                    height={20}
                    className="h-5 w-5"
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
                  style={{ width: "221px", height: "24px", aspectRatio: "221 / 24" }}
                />
                <Image
                  src="/logos/reown-logo-negative 1.svg"
                  alt="Reown"
                  width={200}
                  height={40}
                  className="h-auto w-[160px]"
                  style={{ fill: "var(--UI-OffBlack, #131313)" }}
                />
                <Image
                  src="/refraction.png"
                  alt="Refraction"
                  width={200}
                  height={40}
                  className="h-auto w-[160px]"
                />
              </div>
            </div>

            <div className=" bg-transparent p-6 text-[#131313] backdrop-blur-sm">
              <div className="space-y-4 text-left">
                <div className="body-small font-grotesk text-center">FOR MEMBERS</div>
                <div className="flex flex-col items-start gap-4">
                  <button
                    type="button"
                    className="w-full text-left font-anonymous-pro text-xl underline transition hover:no-underline"
                  >
                    Become A Founding Member →
                  </button>
                  <button
                    type="button"
                    className="w-full text-left font-anonymous-pro text-xl underline transition hover:no-underline"
                  >
                    Editorial →
                  </button>
                  <button
                    type="button"
                    className="w-full text-left font-anonymous-pro text-xl underline transition hover:no-underline"
                  >
                    Frequently Asked Questions →
                  </button>
                  <div className="body-small font-grotesk text-center">
                    FOR VENUES AND BRANDS
                  </div>
                  <button
                    type="button"
                    className="w-full text-left font-anonymous-pro text-xl underline transition hover=no-underline"
                  >
                    Become An IRL Partner →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <ClaimFooter />
      </div>
    </div>
  );
}

