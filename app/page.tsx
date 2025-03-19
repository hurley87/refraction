import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Tokens } from "@/components/homepage/tokens";
import { Events } from "@/components/homepage/events";
export default function Home() {
  return (
    <div className="p-2 sm:p-4 flex flex-col w-full  bg-black font-grotesk">
      {/* Hero Section */}
      <Image
        src="lockup@2x.svg"
        alt="spectrum"
        width={1200}
        height={600}
        className="w-full h-auto"
      />
      {/* Red Section */}
      <div className="p-4 sm:p-8 bg-[#E04220] rounded-sm flex flex-col gap-6 sm:gap-8 md:gap-10">
        <div className="flex flex-row gap-4">
          <h2 className="text-[#FFF7AD] text-2xl sm:text-3xl md:text-4xl">
            {`The IRL ecosystem reimagines the experience economy through its blockchain, token, and protocol, establishing a decentralized foundation for a new era of cultural participation. Rewarding meaningful contributions and creating direct pathways for monetization and interaction, the IRL protocol empowers artists, creators, and audiences to participate in a system that incentivizes collaboration and innovation.`}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link
            target="_blank"
            href="https://linkin.bio/refractionfestival/"
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="uppercase bg-[#FFF7AD] hover:bg-[#FF0000]/90 text-[#E04220] w-full"
            >
              Join the Community
            </Button>
          </Link>

          <Image
            src="community-rings.svg"
            alt="rings"
            width={200}
            height={100}
            className="h-auto w-32 align-right sm:w-auto"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 relative">
        <Image
          src="/images/callout-gradient-overlay.png"
          alt="overlay"
          width={1200}
          height={600}
          className="w-full h-auto m-auto absolute z-10"
        />
        <Image
          src="/images/call_out_image.png"
          alt="crewdem"
          width={1200}
          height={600}
          className="w-full h-auto m-auto z-0"
        />
      </div>

      <Tokens />

      <Events />

      {/* Purple Section */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-[#FFE600] from-10% to-[#F09BC2] to-90% rounded-sm p-4 sm:p-8 gap-6">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-inktrap text-[#000000]">
          Earn IRL
        </h1>
        <div className="flex flex-col gap-6 w-full md:w-1/2">
          <p className="text-[#000000] text-base sm:text-lg">
            {`With real-world utility supported by existing cultural networks, the IRL protocol transcends traditional crypto applications and sets the stage for an inclusive, expansive framework for global cultural engagement.  As much a loyalty points system as a web3 platform, IRL changes how we experience for the better.`}
          </p>
          <Link target="_blank" href="https://linkin.bio/refractionfestival/">
            <Button
              size="lg"
              className="uppercase bg-[#FFF7AD] hover:bg-[#F09BC2]/90 text-[#000000] w-full sm:w-auto"
            >
              Learn more
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex flex-col gap-6 bg-[#221204] rounded-sm p-4 sm:p-8">
        <p className="text-white text-lg sm:text-xl">
          Stay up to date with our newsletter
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Link
            target="_blank"
            href="https://confirmsubscription.com/h/y/2D65DCC50191F65F"
          >
            <Button
              size="lg"
              className="uppercase bg-gradient-to-r from-[#64C4DE] from-10% to-[#ED9DC2] to-90% hover:bg-white text-[#221204] w-full sm:w-auto"
            >
              Sign Up
            </Button>
          </Link>
          <div className="flex gap-4 justify-center sm:justify-end">
            {["twitter", "instagram", "lenster"].map((social) => (
              <Link
                key={social}
                target="_blank"
                href={
                  social === "twitter"
                    ? "https://www.x.com/refractiondao"
                    : social === "instagram"
                    ? "https://instagram.com/refractionfestival"
                    : "https://www.lensfrens.xyz/refraction"
                }
              >
                <Image
                  src={`/images/${social}.png`}
                  alt={social}
                  width={16}
                  height={16}
                  className="h-4 w-auto"
                />
              </Link>
            ))}
          </div>
        </div>

        <Image
          src="irl-logo-footer.svg"
          alt="footer logo"
          width={1200}
          height={200}
          className="w-full h-auto mt-6 sm:mt-10"
        />
      </div>
    </div>
  );
}
