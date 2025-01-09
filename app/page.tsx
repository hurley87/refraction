import { Header } from "@/components/homepage/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-4 flex flex-col w-full gap-4">
      <Header />
      <div className="p-12 bg-black rounded-sm flex flex-col gap-12">
        <div className="flex flex-row gap-12">
          <div className="flex">
            <h2 className="text-[#00E232] text-6xl w-full">
              Refraction is an artist-owned community leading the next wave of
              digital art, music and culture — online, onchain and IRL.
            </h2>
          </div>
          <img
            src="/images/spectrum.png"
            alt="spectrum"
            className="w-1/3 h-auto"
          />
        </div>
        <div className="flex flex-col gap-4">
          <img
            src="/images/lockup_image.png"
            alt="spectrum"
            className="object-scale-down max-h-full m-auto"
          />
        </div>
      </div>
      <div className="p-12 bg-[#FFE1E1] rounded-sm flex flex-col gap-10">
        <div className="flex flex-row gap-4">
          <div className="flex">
            <h2 className="text-[#FF0000] text-4xl font-bold">
              {`Refraction’s online opportunities span educational workshops, creative
                programs, and cultivation of MicroDAOs within our larger structure.`}
            </h2>
          </div>
        </div>
        <div className="flex justify-between">
          <Link
            target="_blank"
            href="https://app.towns.com/t/0xf19e5997fa4df2e12a3961fc7e9ad09c7a301244/"
          >
            <Button
              size="lg"
              className="uppercase bg-[#FF0000] hover:bg-[#FF0000]/90 text-[#95FF0F]"
            >
              Join the Community
            </Button>
          </Link>

          <img
            src="/images/call_out_vector.png"
            alt="vector"
            className=" max-h-full justify-end"
          />
        </div>
        <div className="flex flex-col gap-4 relative">
          <img
            src="/images/callout-gradient-overlay.png"
            alt="overlay"
            className="object-scale-down max-h-full m-auto absolute  z-10"
          />
          <img
            src="/images/call_out_image.png"
            alt="crewdem"
            className="object-scale-down max-h-full m-auto  z-0"
          />
        </div>
      </div>
      <div className="flex justify-between items-center bg-[#E7E3FF] rounded-sm p-12">
        <h1 className="text-7xl text-[#6101FF]">Join Refraction</h1>
        <div className="flex flex-col gap-6 w-1/2">
          <p className="text-[#6101FF] text-lg">
            {`The REFRACT PASS is the most direct way to support Refraction’s mission of empowering creatives and building a future that values the economic independence of artists across the world.*Mint a REFRACT PASS to gain full membership.`}
          </p>
          <div className="flex gap-4">
            <Link
              target="_blank"
              href="https://zora.co/collect/eth:0x115b90187d38dc0a9a9d6bdc8ec9b1f492964894"
            >
              <Button
                size="lg"
                className="uppercase bg-[#6101FF] hover:bg-[#6101FF]/90 text-[#FFFFFF]"
              >
                Mint PASS
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 bg-[#221204] rounded-sm p-12">
        <div className="flex flex-col gap-4">
          <p className="text-white text-xl">
            Stay up to date with our newsletter
          </p>
        </div>
        <div className="flex flex-row gap-4 justify-between">
          <div className="flex gap-4 ">
            <Link
              target="_blank"
              href="https://confirmsubscription.com/h/y/2D65DCC50191F65F"
            >
              <Button
                size="lg"
                className="uppercase bg-gradient-to-r from-orange-500 from-10% via-yellow-500 via-30% to-green-500 to-90%  hover:bg-orange-500 text-[#221204]"
              >
                Sign Up
              </Button>
            </Link>
          </div>
          <div className="flex gap-4 justify-end">
             <Link
              target="_blank"
              href="https://discord.gg/TmTcbaDr"
            > <img src="/images/discord.png" alt="join" className="object-scale-down max-h-full m-auto" /></Link>
            <Link
              target="_blank"
              href="https://www.x.com/refractiondao"
            > <img src="/images/twitter.png" alt="join" className="object-scale-down max-h-full m-auto" /></Link>
            <Link
              target="_blank"
              href="https://instagram.com/refractionfestival"
            > <img src="/images/instagram.png" alt="join" className="object-scale-down max-h-full m-auto" /></Link>
            <Link
              target="_blank"
              href="https://www.lensfrens.xyz/refraction"
            > <img src="/images/lenster.png" alt="join" className="object-scale-down max-h-full m-auto" /></Link>
          </div>
        </div>

        <div className="flex">
          <img
            src="/images/footer-logo.png"
            alt="join"
            className="object-scale-down max-h-full m-auto"
          />
        </div>
      </div>
    </div>
  );
}
