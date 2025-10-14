"use client";

/**
 * Artist CTA component - Call to action for artists to join IRL
 */
export default function ArtistCTA() {
  return (
    <section className="relative w-full bg-black py-24 md:py-32">
      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        {/* Content container */}
        <div className="flex flex-col gap-4 items-center text-center max-w-[900px] w-full">
          {/* Small header */}
          <p className="font-grotesk font-medium text-[11px] leading-[16px] text-white tracking-[0.44px] uppercase">
            Become an Artist
          </p>

          {/* Main heading */}
          <h2 className="font-pleasure text-[32px] leading-[44px] md:text-[64px] md:leading-[70px] tracking-[-1px] text-white">
            IRL launched with an alumni network of 2000+ DJs, music and visual
            artists.
          </h2>

          {/* CTA Button */}
          <button className="bg-white flex h-14 items-center justify-between px-6 py-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors group min-w-[300px] mt-4">
            <span className="font-pleasure font-black text-[16px] leading-[16px] text-[#313131] tracking-[-0.5px]">
              Become a Founding Member
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="12"
              viewBox="0 0 18 12"
              fill="none"
            >
              <path
                d="M12 0C12 0.636 12.5498 1.58571 13.1063 2.38286C13.8218 3.41143 14.6767 4.30886 15.657 4.99371C16.392 5.50714 17.283 6 18 6M18 6C17.283 6 16.3912 6.49286 15.657 7.00629C14.6767 7.692 13.8218 8.58943 13.1063 9.61629C12.5498 10.4143 12 11.3657 12 12M18 6H0"
                stroke="#7D7D7D"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
