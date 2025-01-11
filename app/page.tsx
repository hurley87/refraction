import { Header } from "@/components/homepage/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Tokens } from "@/components/homepage/tokens";

export default function Home() {
  return (
    <div className="p-2 sm:p-4 flex flex-col w-full gap-4">
      <Header />

      {/* Hero Section */}
      <div className="p-4 sm:p-8 bg-black rounded-sm flex flex-col gap-8 md:gap-12">
        <div className="flex flex-col md:flex-row md:gap-12 gap-6">
          <h2 className="text-[#00E232] text-2xl sm:text-5xl w-full">
            Refraction is an artist-owned community leading the next wave of
            digital art, music and culture — online, onchain and IRL.
          </h2>
          <div className="w-full md:w-3/5">
            <Image
              src="/images/spectrum.png"
              alt="spectrum"
              width={400}
              height={400}
              className="w-full h-auto"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Image
            src="/images/lockup_image.png"
            alt="spectrum"
            width={1200}
            height={600}
            className="w-full h-auto"
          />
        </div>
      </div>

      <Tokens />

      {/* Red Section */}
      <div className="p-4 sm:p-8 bg-[#FFE1E1] rounded-sm flex flex-col gap-6 sm:gap-8 md:gap-10">
        <div className="flex flex-row gap-4">
          <h2 className="text-[#FF0000] text-2xl sm:text-3xl md:text-4xl">
            {`Refraction's online opportunities span educational workshops, creative
              programs, and cultivation of MicroDAOs within our larger structure.`}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link
            target="_blank"
            href="https://app.towns.com/t/0xf19e5997fa4df2e12a3961fc7e9ad09c7a301244/"
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="uppercase bg-[#FF0000] hover:bg-[#FF0000]/90 text-[#95FF0F] w-full"
            >
              Join the Community
            </Button>
          </Link>

          <Image
            src="/images/call_out_vector.png"
            alt="vector"
            width={200}
            height={100}
            className="h-auto w-32 sm:w-auto"
          />
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
      </div>

      {/* Purple Section */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#E7E3FF] rounded-sm p-4 sm:p-8 gap-6">
        <h1 className="text-4xl sm:text-5xl md:text-7xl text-[#6101FF]">
          Join Refraction
        </h1>
        <div className="flex flex-col gap-6 w-full md:w-1/2">
          <p className="text-[#6101FF] text-base sm:text-lg">
            {`The REFRACT PASS is the most direct way to support Refraction's mission of empowering creatives and building a future that values the economic independence of artists across the world.*Mint a REFRACT PASS to gain full membership.`}
          </p>
          <Link
            target="_blank"
            href="https://zora.co/collect/eth:0x115b90187d38dc0a9a9d6bdc8ec9b1f492964894"
          >
            <Button
              size="lg"
              className="uppercase bg-[#6101FF] hover:bg-[#6101FF]/90 text-[#FFFFFF] w-full sm:w-auto"
            >
              Mint PASS
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
              className="uppercase bg-gradient-to-r from-orange-500 from-10% via-yellow-500 via-30% to-green-500 to-90% hover:bg-orange-500 text-[#221204] w-full sm:w-auto"
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
          src="/images/footer-logo.png"
          alt="footer logo"
          width={1200}
          height={200}
          className="w-full h-auto mt-6 sm:mt-10"
        />
      </div>
    </div>
  );
}
