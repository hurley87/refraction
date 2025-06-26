import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Metadata } from "next";

const appUrl = "https://www.irl.energy";

const frame = {
  version: "next",
  imageUrl: `${appUrl}/logo.png`,
  button: {
    title: "Join IRL",
    action: {
      type: "launch_frame",
      name: "IRL",
      url: `${appUrl}/frame`,
      splashImageUrl: `${appUrl}/logo.png`,
      splashBackgroundColor: "#FFFFFF",
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "IRL",
    openGraph: {
      title: "IRL",
      description:
        "The IRL protocol empowers artists, creators, and audiences to participate in a system that incentivizes collaboration and innovation.",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {
  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #EE91B7 0%, #FFE600 37.5%, #1BA351 66.34%, #61BFD1 100%)",
      }}
      className="min-h-screen"
    >
      {/* Hero Section */}
      <section
        style={{
          backgroundImage: "url('/home/hero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative min-h-screen flex flex-col justify-center items-start px-4 sm:px-8 lg:px-16 py-8 sm:py-16 rounded-b-4xl"
      >
        {/* Logo/Header */}
        <div className="absolute top-4 sm:top-8 left-4 sm:left-8 lg:left-16">
          <div className="text-white text-4xl font-bold font-inktrap">IRL</div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl w-full mt-16 sm:mt-24">
          <h1 className="text-[#FFE600] font-inktrap text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 sm:mb-8">
            BRIDGING CULTURE
            <br />
            AND TECHNOLOGY
          </h1>

          <p className="text-[#FFE600] font-inktrap text-lg sm:text-xl lg:text-2xl max-w-2xl mb-8 sm:mb-12 leading-relaxed">
            Earn Points. Unlock Rewards.
            <br />
            Revolutionize the Creative Economy.
          </p>
          <Link href="/game">
            <Button
              size="lg"
              className="bg-white hover:bg-white/90 font-inktrap text-black font-semibold text-base px-8 sm:px-12 py-3 sm:py-4 rounded-full"
            >
              Check In to Earn Points
            </Button>
          </Link>
          <p className="text-[#FFE600] font-inktrap text-sm sm:text-base pt-4">
            POWERED BY <span className="font-bold">REFRACTION</span>
          </p>
        </div>
      </section>

      {/* IRL Section */}
      <section className="py-48">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="flex justify-center">
            <div className="space-y-6 sm:space-y-8">
              <p className="text-white text-lg sm:text-xl lg:text-3xl leading-relaxed max-w-xl text-left font-inktrap">
                {`Developed by Refraction, a pioneer in web3 arts and culture, the
                IRL protocol realizes the blockchain's potential to
                revolutionize the creative industry.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Airdrop Section */}
      <section
        style={{
          backgroundImage: "url('/home/airdrop.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative py-16 sm:py-24 lg:py-32 rounded-xl w-full"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="order-1 lg:order-1">
              {/* Image placeholder - user will add later */}
              <div className="aspect-square rounded-lg"></div>
            </div>
            <div className="order-2 lg:order-2">
              <h2 className="text-[#FFE600] text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 sm:mb-8 font-inktrap">
                BE THE FIRST
                <br />
                TO ACCESS THE
                <br />
                IRL AIRDROP
              </h2>

              <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
                <p className=" text-base sm:text-lg leading-relaxed font-inktrap text-[#FFE600]">
                  Powered by Refraction, the IRL network uses blockchain
                  technology to reward audiences for artists with fans for
                  creating and engaging with culture.
                </p>
                <p className="text-[#FFE600] font-inktrap text-base sm:text-lg leading-relaxed">
                  Check in to earn IRL, gain exclusive access to experiences and
                  rewards, and help build the new creative economy.
                </p>
              </div>
              <Link href="/game">
                <Button
                  size="lg"
                  className="bg-white hover:bg-white/90 text-black font-semibold text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 rounded-full w-full sm:w-auto font-inktrap"
                >
                  Complete Your First Challenge
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Claim Points Section */}
      <section className=" py-16 sm:py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 lg:px-16 text-center">
          <h2 className="text-black text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 sm:mb-12 font-inktrap">
            CLAIM
            <br />
            YOUR POINTS
          </h2>

          <p className="text-black text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto font-inktrap">
            Check in to earn points on the IRL network, with instant access to
            future rewards and experiences.
          </p>
          <Link href="/game">
            <Button
              size="lg"
              className="bg-white hover:bg-white/90 text-black font-inktrap font-semibold text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 rounded-full"
            >
              Check In to Earn Points
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer Section */}
      <section className="py-16 sm:py-24">
        <img
          src="/irlfooterlogo.svg"
          alt="irl"
          className="w-full h-auto mt-10"
        />
      </section>
    </div>
  );
}
