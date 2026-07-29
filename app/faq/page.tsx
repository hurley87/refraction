import type { ReactNode } from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { FaqContactForm } from '@/components/faq/faq-contact-form';
import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

const FAQ_ITEMS: { question: string; answer: ReactNode }[] = [
  {
    question: 'What is IRL?',
    answer: (
      <p>
        IRL is a rewards platform that helps you discover cultural venues and
        experiences, check in when you attend, earn IRL Points, and redeem
        exclusive perks from participating partners.
      </p>
    ),
  },
  {
    question: 'How do I earn IRL Points?',
    answer: (
      <p>
        You earn IRL Points by participating in experiences across the IRL
        network. This includes checking into participating venues, attending
        eligible events, and completing activities made available through the
        app.
      </p>
    ),
  },
  {
    question: 'What can I use my points for?',
    answer: (
      <p>
        IRL Points can be redeemed for perks and experiences offered by
        participating venues and partners. Available rewards are shown directly
        inside the app and continue to grow as the network expands.
      </p>
    ),
  },
  {
    question: 'Do my points expire?',
    answer: (
      <p>
        Unless otherwise stated for a specific campaign or promotion, IRL Points
        do not expire.
      </p>
    ),
  },
  {
    question: 'Is the app free?',
    answer: (
      <p>Yes. Creating an account and using the IRL app is completely free.</p>
    ),
  },
  {
    question: 'How is the wallet designed in IRL?',
    answer: (
      <p>
        IRL is designed to feel like any modern consumer application. Wallet
        infrastructure is managed behind the scenes, allowing you to simply
        create an account and begin earning rewards.
      </p>
    ),
  },
  {
    question: 'Is there a token?',
    answer: (
      <>
        <p>Not today.</p>
        <p>
          IRL currently operates as a points-based rewards platform. In the
          future, we expect to introduce additional network functionality,
          including a token, once the platform and ecosystem have matured. Any
          future launch will be announced separately.
        </p>
      </>
    ),
  },
  {
    question: "I didn't receive my points.",
    answer: (
      <p>
        If you&apos;ve attended a participating venue or event and believe
        points are missing, please contact our support team and we&apos;ll
        investigate.
      </p>
    ),
  },
  {
    question: 'How do I become a partner?',
    answer: (
      <>
        <p>
          If you&apos;re a venue, festival, brand, or community interested in
          joining the IRL network, we&apos;d love to hear from you.
        </p>
        <p>
          Use the{' '}
          <a
            href="#contact"
            className="text-white underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            contact form
          </a>{' '}
          below.
        </p>
      </>
    ),
  },
];

function PageHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <WelcomeEllipse />
      <h1 className="title2 text-left text-white">{children}</h1>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <WelcomeEllipse />
      <h2 className="title3 text-left text-white">{children}</h2>
    </div>
  );
}

function FaqQuestionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <WelcomeEllipse />
      <h3 className="title4 text-left text-white">{children}</h3>
    </div>
  );
}

function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="title4 text-white">{children}</h3>;
}

function Body({ children }: { children: ReactNode }) {
  return <div className="body-medium space-y-4 text-[#DBDBDB]">{children}</div>;
}

export default function FAQPage() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313]">
      <Header variant="home" />

      <main className="relative z-10 px-4 pt-24 pb-16 md:px-8 md:pt-32">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-16 text-white md:space-y-24">
            {/* FAQ */}
            <section className="space-y-10 md:space-y-12">
              <PageHeading>Frequently Asked Questions</PageHeading>

              <div className="space-y-12 md:space-y-16">
                {FAQ_ITEMS.map((item) => (
                  <article key={item.question} className="space-y-4">
                    <FaqQuestionHeading>{item.question}</FaqQuestionHeading>
                    <Body>{item.answer}</Body>
                  </article>
                ))}
              </div>
            </section>

            {/* Terms of Service */}
            <section id="terms" className="space-y-8 scroll-mt-28">
              <div className="space-y-2">
                <SectionHeading>Terms of Service</SectionHeading>
                <p className="body-medium text-[#A9A9A9]">
                  Effective Date: July 2026
                </p>
              </div>

              <Body>
                <p>
                  By creating an account or using the IRL platform, you agree to
                  these Terms.
                </p>
              </Body>

              <div className="space-y-4">
                <LegalSubheading>Use of the Service</LegalSubheading>
                <Body>
                  <p>
                    IRL provides a platform for discovering venues, earning
                    points through participation, and redeeming eligible
                    rewards.
                  </p>
                  <p>
                    Users agree to use the platform lawfully and may not misuse,
                    manipulate, or attempt to fraudulently earn points or
                    rewards.
                  </p>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>Accounts</LegalSubheading>
                <Body>
                  <p>
                    You are responsible for maintaining the security of your
                    account and any login credentials associated with it.
                  </p>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>IRL Points</LegalSubheading>
                <Body>
                  <p>IRL Points are promotional reward points.</p>
                  <p>They:</p>
                  <ul className="list-inside list-disc space-y-2 pl-4">
                    <li>have no cash value;</li>
                    <li>cannot be transferred unless expressly permitted;</li>
                    <li>may not be sold or exchanged;</li>
                    <li>may be modified or discontinued at any time.</li>
                  </ul>
                  <p>
                    Perks and rewards are offered by participating partners and
                    remain subject to availability.
                  </p>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>Future Features</LegalSubheading>
                <Body>
                  <p>
                    IRL may introduce additional features, including payment
                    functionality or digital assets, in the future. Any new
                    functionality will be governed by updated Terms where
                    applicable.
                  </p>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>Availability</LegalSubheading>
                <Body>
                  <p>
                    We continually improve the platform and may modify, suspend,
                    or discontinue features without prior notice.
                  </p>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>Limitation of Liability</LegalSubheading>
                <Body>
                  <p>
                    The platform is provided &quot;as is&quot; without
                    warranties of uninterrupted availability. IRL is not
                    responsible for losses resulting from service interruptions,
                    third-party partner offerings, or user misuse of the
                    platform.
                  </p>
                </Body>
              </div>
            </section>

            {/* Privacy Policy */}
            <section id="privacy" className="space-y-8 scroll-mt-28">
              <div className="space-y-2">
                <SectionHeading>Privacy Policy</SectionHeading>
                <p className="body-medium text-[#A9A9A9]">
                  Effective Date: July 2026
                </p>
              </div>

              <Body>
                <p>Your privacy is important to us.</p>
              </Body>

              <div className="space-y-4">
                <LegalSubheading>Information We Collect</LegalSubheading>
                <Body>
                  <p>We may collect:</p>
                  <ul className="list-inside list-disc space-y-2 pl-4">
                    <li>Account information</li>
                    <li>Email address</li>
                    <li>Authentication information</li>
                    <li>Device information</li>
                    <li>Location (when permission is granted)</li>
                    <li>Venue check-ins</li>
                    <li>Reward activity</li>
                    <li>Usage analytics</li>
                  </ul>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>How We Use Information</LegalSubheading>
                <Body>
                  <p>Your information is used to:</p>
                  <ul className="list-inside list-disc space-y-2 pl-4">
                    <li>operate the IRL platform;</li>
                    <li>award points and perks;</li>
                    <li>improve product performance;</li>
                    <li>prevent fraud;</li>
                    <li>communicate important service updates.</li>
                  </ul>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>Data Sharing</LegalSubheading>
                <Body>
                  <p>We do not sell your personal information.</p>
                  <p>
                    We may share limited information with trusted service
                    providers required to operate the platform, including
                    authentication, analytics, cloud infrastructure, and
                    participating reward partners where necessary to fulfill a
                    redemption.
                  </p>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>Security</LegalSubheading>
                <Body>
                  <p>
                    We use commercially reasonable safeguards to protect user
                    information; however, no online service can guarantee
                    absolute security.
                  </p>
                </Body>
              </div>

              <div className="space-y-4">
                <LegalSubheading>Your Choices</LegalSubheading>
                <Body>
                  <p>
                    You may request access to, correction of, or deletion of
                    your account information by using the{' '}
                    <a
                      href="#contact"
                      className="text-white underline underline-offset-2 transition-opacity hover:opacity-80"
                    >
                      contact form
                    </a>{' '}
                    below.
                  </p>
                </Body>
              </div>
            </section>

            {/* Contact */}
            <section id="contact" className="space-y-6 scroll-mt-28">
              <SectionHeading>Contact</SectionHeading>
              <Body>
                <p>Need help?</p>
                <p>
                  For partnership inquiries, support requests, or general
                  questions, send us a message and our team will respond as
                  quickly as possible.
                </p>
              </Body>
              <FaqContactForm />
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
