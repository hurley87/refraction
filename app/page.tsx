import { Header } from "@/components/homepage/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <Header />
      <div className="p-6 bg-black rounded-sm flex flex-col gap-4">
        <div className="flex gap-4">
          <h2 className="text-[#00E232] text-2xl">
            Refraction is an artist-owned community leading the next wave of
            digital art, music and culture — online, onchain and IRL.
          </h2>
        </div>
      </div>
      <div className="p-6 bg-[#FFE1E1] rounded-sm flex flex-col gap-4">
        <h2 className="text-[#FF0000] text-2xl font-bold">
          {`Refraction’s online opportunities span educational workshops, creative
          programs, and cultivation of MicroDAOs within our larger structure.`}
        </h2>
        <div className="flex justify-start">
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
        </div>
      </div>
      <div className="flex flex-col gap-4 bg-[#E7E3FF] rounded-sm p-6">
        <div className="flex">
          <h2 className="text-[#6101FF] text-2xl font-bold w-1/2">
            Join Refraction
          </h2>
          <div className="flex flex-col gap-4 w-1/2">
            <p className="text-[#6101FF] text-sm">
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
      </div>
      <div className="flex flex-col gap-4 bg-[#221204] rounded-sm p-6">
        <p className="text-white">Stay up to date with our newsletter</p>
        <div className="flex gap-4 justify-start">
          <Link
            target="_blank"
            href="https://confirmsubscription.com/h/y/2D65DCC50191F65F"
          >
            <Button
              size="lg"
              className="uppercase bg-[#FF9900] hover:bg-[#FF9900]/90 text-[#221204]"
            >
              Subscribe
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
