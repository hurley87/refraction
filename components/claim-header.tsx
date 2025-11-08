import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function ClaimHeader() {
  return (
    <div className="flex justify-center px-4 pt-4">
      <div
        className="flex h-[53px] w-full max-w-[393px] flex-shrink-0 flex-col items-center justify-center rounded-[26px] border border-[#EDEDED] px-4 py-2"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.45) 100%)",
          boxShadow: "0 4px 8px 0 rgba(255, 255, 255, 0.15) inset",
          backdropFilter: "blur(32px)",
        }}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="relative flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[#313131]"
            >
              <Image
                src="/home/IRL.png"
                alt="IRL"
                width={27}
                height={14}
                className="block"
              />
            </Link>
          </div>
          <Button
            className="flex h-[40px] items-center gap-2 rounded-full bg-[#B5B5B5] px-3 py-2 transition hover:bg-[#B5B5B5]/80"
            size="sm"
            type="button"
          >
            <span className="body-small font-grotesk text-[#131313] uppercase">
              Sign Up
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

