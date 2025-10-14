import Link from "next/link";
import Image from "next/image";

/**
 * Header component for the IRL website
 * Features a logo on the left and "Become A Partner" button on the right
 */
export default function Header() {
  return (
    <div
      className=" max-w-7xl mx-auto absolute top-10 left-10 right-10 z-50 rounded-[26px] backdrop-blur-[32px] bg-gradient-to-b from-white/[0.157] to-white/[0.45] border border-white/25"
      data-name="Hero"
    >
      <nav
        className="flex items-center justify-between px-2 py-2 overflow-clip rounded-[inherit]"
        data-name="Nav"
      >
        {/* Inner shadow overlay */}
        <div className="absolute inset-0 pointer-events-none shadow-[0px_4px_8px_0px_inset_rgba(255,255,255,0.15)] rounded-[inherit]" />

        {/* Logo */}
        <Link href="/" className="shrink-0 relative z-10">
          <div className="bg-[#313131] rounded-full w-[40px] h-[40px] flex items-center justify-center hover:opacity-90 transition-opacity">
            <Image
              src="/home/IRL.png"
              alt="IRL"
              width={27.312}
              height={14}
              className="block"
            />
          </div>
        </Link>

        {/* Become A Partner Button */}
        <Link href="/contact-us" className="shrink-0 relative z-10">
          <button className="bg-white hover:bg-white/80 active:bg-white/60 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 flex items-center gap-2 transition-all cursor-pointer group">
            <span className="font-['ABC_Monument_Grotesk_Semi-Mono',_sans-serif] text-black text-[11px] leading-[16px] tracking-[0.44px] uppercase whitespace-nowrap">
              Become A Partner
            </span>
          </button>
        </Link>
      </nav>
    </div>
  );
}
