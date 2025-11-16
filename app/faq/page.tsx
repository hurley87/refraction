import Header from "@/components/header";
import Footer from "@/components/footer";

export default function FAQPage() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-0 md:p-4">
        <Header />
      </div>

      {/* Main Content */}
      <main className="relative z-10 pt-24 md:pt-32 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-white font-pleasure text-4xl md:text-6xl font-bold mb-12 md:mb-16 text-center md:text-left">
            IRL & $IRL Token — FAQ
          </h1>

          {/* FAQ Content */}
          <div className="space-y-12 md:space-y-16 text-white">
            {/* Question 1 */}
            <div className="space-y-4">
              <h2 className="font-pleasure text-2xl md:text-3xl font-bold">
                1. What is IRL?
              </h2>
              <div className="font-grotesk text-base md:text-lg leading-relaxed space-y-4 text-[#ededed]">
                <p>
                  IRL is a new protocol that turns cultural participation — like
                  going to events, buying merch, or joining quests — into ownership.
                  Through IRL Points and the $IRL token, you gain access to perks
                  and governance in a decentralized cultural economy.
                </p>
                <p>
                  IRL is a loyalty program created by Refraction, an artist-owned
                  community leading the next wave of digital art, music and culture
                  — online, onchain and IRL. We support culture through festivals,
                  exhibitions, digital experiences, and now, IRL — our protocol for
                  cultural loyalty.{" "}
                  <a
                    href="#"
                    className="underline hover:no-underline transition-all"
                  >
                    More here
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Question 2 */}
            <div className="space-y-4">
              <h2 className="font-pleasure text-2xl md:text-3xl font-bold">
                2. Who is IRL for?
              </h2>
              <div className="font-grotesk text-base md:text-lg leading-relaxed text-[#ededed]">
                <p>
                  IRL is for everyone who shows up for culture: from music lovers
                  and art fans to promoters, galleries, and Web3 builders. Whether
                  you&apos;re at a club, in a gallery, or online, IRL lets you earn
                  from participating in the scenes you love.
                </p>
              </div>
            </div>

            {/* Question 3 */}
            <div className="space-y-4">
              <h2 className="font-pleasure text-2xl md:text-3xl font-bold">
                3. How do I earn IRL Points?
              </h2>
              <div className="font-grotesk text-base md:text-lg leading-relaxed space-y-4 text-[#ededed]">
                <p>
                  Right now, you can earn IRL Points by checking into Refraction
                  events, scanning the IRL checkpoint, and completing quests — like
                  following us on social media, collecting artwork, or buying a drink.
                </p>
                <p>Soon, this system will roll out to partner events worldwide.</p>
                <p>
                  A public IRL Points Dashboard is coming soon — and once the $IRL
                  token launches, your verified Points will be redeemable for tokens.
                </p>
              </div>
            </div>

            {/* Question 4 */}
            <div className="space-y-4">
              <h2 className="font-pleasure text-2xl md:text-3xl font-bold">
                4. I claimed IRL Points — now what?
              </h2>
              <div className="font-grotesk text-base md:text-lg leading-relaxed space-y-4 text-[#ededed]">
                <p>
                  For now, just sit tight. Your Points are recorded and will count
                  toward future rewards — including token conversion, merch drops,
                  and access to gated experiences.
                </p>
                <p>
                  Once the IRL Dashboard goes live, you&apos;ll be able to track
                  your Points and see what they unlock.
                </p>
              </div>
            </div>

            {/* Question 5 */}
            <div className="space-y-4">
              <h2 className="font-pleasure text-2xl md:text-3xl font-bold">
                5. When does the $IRL token launch?
              </h2>
              <div className="font-grotesk text-base md:text-lg leading-relaxed text-[#ededed]">
                <p>
                  The $IRL token launches in Q4 2025, starting with a Points snapshot
                  and first conversion epoch. Only verified participants will be
                  eligible to claim.
                </p>
              </div>
            </div>

            {/* Question 6 */}
            <div className="space-y-4">
              <h2 className="font-pleasure text-2xl md:text-3xl font-bold">
                6. What&apos;s the difference between Points and $IRL tokens?
              </h2>
              <div className="font-grotesk text-base md:text-lg leading-relaxed space-y-4 text-[#ededed]">
                <p>
                  IRL Points are your cultural loyalty rewards. You earn them by
                  showing up at events, buying merch, or completing Side Quests —
                  both in-person and online. They&apos;re not money, they can&apos;t
                  be traded, and they reset monthly.
                </p>
                <p>
                  But here&apos;s the twist: every month, we take a snapshot of
                  everyone&apos;s Points and convert them into $IRL tokens — a
                  digital token that is yours to keep, trade, or use.
                </p>
                <p className="font-semibold text-white mt-6 mb-2">
                  Think of it like this:
                </p>
                <div className="space-y-2 pl-4 border-l-2 border-white/20">
                  <p>
                    <span className="font-semibold">Points</span> = your participation
                  </p>
                  <p>
                    <span className="font-semibold">Tokens</span> = your ownership
                  </p>
                </div>
                <p>
                  Once converted, your $IRL tokens unlock a whole new layer of
                  benefits from early event access and exclusive drops to community
                  voting, staking rewards, and even funding creative projects. The
                  earlier and more often you participate, the more you&apos;ll earn.
                </p>
              </div>
            </div>

            {/* Question 7 */}
            <div className="space-y-4">
              <h2 className="font-pleasure text-2xl md:text-3xl font-bold">
                7. What&apos;s the Refract Pass — and should I get one?
              </h2>
              <div className="font-grotesk text-base md:text-lg leading-relaxed space-y-4 text-[#ededed]">
                <p>
                  The Refract Pass began as a badge of early support for the
                  Refraction community — unlocking exclusive art drops and global
                  event access.
                </p>
                <p>
                  Because Pass holders were the first to show up, they&apos;re the
                  first to get rewarded. Holding one means:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4 mt-4">
                  <li>
                    Bonus IRL Points when the Points Dashboard launches (June 26)
                  </li>
                  <li>
                    Priority access to exclusive quests, merch, and events
                  </li>
                  <li>Eligibility for $IRL token claims</li>
                  <li>
                    Auto-inclusion in new perks programs with partner brands and
                    venues
                  </li>
                </ul>
                <p>
                  It&apos;s the easiest way to get ahead before the IRL Points
                  Dashboard goes live. Pass holders will be among the first to claim
                  rewards and rise through the ranks.
                </p>
                <p className="mt-6">
                  <a
                    href="https://opensea.io/collection/refract-pass"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline transition-all font-semibold text-white"
                  >
                    → Grab yours on OpenSea
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

