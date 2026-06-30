import type { ReactNode } from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

function FaqSectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <WelcomeEllipse />
      <h2 className="title4 text-left text-white">{children}</h2>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313]">
      <Header variant="home" />

      <main className="relative z-10 px-4 pt-24 pb-16 md:px-8 md:pt-32">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-12 text-white md:space-y-16">
            <section className="space-y-4">
              <FaqSectionHeading>What is IRL?</FaqSectionHeading>
              <div className="body-medium space-y-4 text-[#DBDBDB]">
                <p>
                  IRL is a new protocol that turns cultural participation — like
                  going to events, buying merch, or joining quests — into
                  ownership. Through IRL Points and the $IRL token, you gain
                  access to perks and governance in a decentralized cultural
                  economy.
                </p>
                <p>
                  IRL is a loyalty program created by Refraction, an
                  artist-owned community leading the next wave of digital art,
                  music and culture — online, onchain and IRL. We support
                  culture through festivals, exhibitions, digital experiences,
                  and now, IRL — our protocol for cultural loyalty.{' '}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <FaqSectionHeading>Who is IRL for?</FaqSectionHeading>
              <div className="body-medium text-[#DBDBDB]">
                <p>
                  IRL is for everyone who shows up for culture: from music
                  lovers and art fans to promoters, galleries, and Web3
                  builders. Whether you&apos;re at a club, in a gallery, or
                  online, IRL lets you earn from participating in the scenes you
                  love.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <FaqSectionHeading>How do I earn IRL Points?</FaqSectionHeading>
              <div className="body-medium space-y-4 text-[#DBDBDB]">
                <p>
                  Right now, you can earn IRL Points by checking into Refraction
                  events, scanning the IRL checkpoint, and completing quests —
                  like following us on social media, collecting artwork, or
                  buying a drink.
                </p>
                <p>
                  Soon, this system will roll out to partner events worldwide.
                </p>
                <p>
                  A public IRL Points Dashboard is coming soon — and once the
                  $IRL token launches, your verified Points will be redeemable
                  for tokens.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <FaqSectionHeading>
                I claimed IRL Points — now what?
              </FaqSectionHeading>
              <div className="body-medium space-y-4 text-[#DBDBDB]">
                <p>
                  For now, just sit tight. Your Points are recorded and will
                  count toward future rewards — including token conversion,
                  merch drops, and access to gated experiences.
                </p>
                <p>
                  Once the IRL Dashboard goes live, you&apos;ll be able to track
                  your Points and see what they unlock.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <FaqSectionHeading>
                When does the $IRL token launch?
              </FaqSectionHeading>
              <div className="body-medium text-[#DBDBDB]">
                <p>
                  The $IRL token launches in Q4 2026, starting with a Points
                  snapshot and first conversion epoch. Only verified
                  participants will be eligible to claim.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <FaqSectionHeading>
                What&apos;s the difference between Points and $IRL tokens?
              </FaqSectionHeading>
              <div className="body-medium space-y-4 text-[#DBDBDB]">
                <p>
                  IRL Points are your cultural loyalty rewards. You earn them by
                  showing up at events, buying merch, or completing Side Quests
                  — both in-person and online. They&apos;re not money, they
                  can&apos;t be traded, and they reset monthly.
                </p>
                <p>
                  But here&apos;s the twist: every month, we take a snapshot of
                  everyone&apos;s Points and convert them into $IRL tokens — a
                  digital token that is yours to keep, trade, or use.
                </p>
                <p className="title4 mt-6 mb-2 text-white">
                  Think of it like this:
                </p>
                <div className="space-y-2 border-l-2 border-white/20 pl-4">
                  <p>
                    <span className="text-white">Points</span> = your
                    participation
                  </p>
                  <p>
                    <span className="text-white">Tokens</span> = your ownership
                  </p>
                </div>
                <p>
                  Once converted, your $IRL tokens unlock a whole new layer of
                  benefits from early event access and exclusive drops to
                  community voting, staking rewards, and even funding creative
                  projects. The earlier and more often you participate, the more
                  you&apos;ll earn.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <FaqSectionHeading>
                What&apos;s the Refract Pass — and should I get one?
              </FaqSectionHeading>
              <div className="body-medium space-y-4 text-[#DBDBDB]">
                <p>
                  The Refract Pass began as a badge of early support for the
                  Refraction community — unlocking exclusive art drops and
                  global event access.
                </p>
                <p>
                  Because Pass holders were the first to show up, they&apos;re
                  the first to get rewarded. Holding one means:
                </p>
                <ul className="mt-4 list-inside list-disc space-y-2 pl-4">
                  <li>
                    Bonus IRL Points when the Points Dashboard launches (June
                    26)
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
                  Dashboard goes live. Pass holders will be among the first to
                  claim rewards and rise through the ranks.
                </p>
                <p className="mt-6">
                  <a
                    href="https://opensea.io/collection/refract-pass"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="title4 inline-flex items-center gap-2 border-b border-[#FFF] text-white transition-opacity hover:opacity-80"
                  >
                    → Grab yours on OpenSea
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
