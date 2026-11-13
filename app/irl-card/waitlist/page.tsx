import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import Header from '@/components/layout/header';
import { IrlCardWaitlistForm } from '@/components/irl-card/irl-card-waitlist-form';
import { IRL_CARD_WAITLIST_COPY as COPY } from '@/lib/irl-card/waitlist-copy';
import { IRL_CARD_WAITLIST_PATH } from '@/lib/irl-card/waitlist-urls';
import { getMetadataBaseForRequest } from '@/lib/metadata/request-base';

const Footer = dynamic(() => import('@/components/layout/footer'), {
  ssr: true,
});

export async function generateMetadata(): Promise<Metadata> {
  const { metadataBase } = getMetadataBaseForRequest(headers());
  const canonical = new URL(IRL_CARD_WAITLIST_PATH, metadataBase).href;
  const title = `${COPY.productLabel} · ${COPY.headline}`;

  // The root layout defines `openGraph`, so these must be set explicitly or the
  // unfurled preview inherits the site-wide title and description.
  return {
    title,
    description: COPY.body,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: COPY.body,
      type: 'website',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: COPY.body,
    },
  };
}

export default function IrlCardWaitlistPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-white">
      <Header variant="home" />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-16 pt-28 md:flex-row md:gap-16 md:px-8 md:pt-36">
        <section
          className="flex flex-col gap-5 md:w-1/2"
          aria-labelledby="irl-card-headline"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FFF200]">
            {COPY.productLabel}
          </p>
          <h1
            id="irl-card-headline"
            className="text-[44px] font-semibold leading-[46px] tracking-[-2px] md:text-[64px] md:leading-[64px] md:tracking-[-3px]"
          >
            {COPY.headline}
          </h1>
          <p className="max-w-md text-lg leading-7 text-white/80">
            {COPY.body}
          </p>
        </section>
        <section className="md:w-1/2" aria-label={COPY.submit}>
          <IrlCardWaitlistForm />
        </section>
      </main>
      <Footer />
    </div>
  );
}
