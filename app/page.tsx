import dynamic from 'next/dynamic';
import Header from '@/components/layout/header';
import Hero from '@/components/home/hero';
import {
  getHomepageFeaturedEvent,
  type HomepageFeaturedEvent,
} from '@/lib/home/featured-event';
import { getFeaturedDiceEventId } from '@/lib/db/featured-dice-event';

// Temporarily hidden — re-enable import and JSX block below to restore
// const WhatYouGetSection = dynamic(
//   () => import('@/components/home/what-you-get-section'),
//   { ssr: true }
// );
// Temporarily hidden — re-enable import and JSX block below to restore
// const CheckInsFundCultureSection = dynamic(
//   () => import('@/components/home/check-ins-fund-culture-section'),
//   { ssr: true }
// );
const CityGuidesCarouselSection = dynamic(
  () => import('@/components/home/city-guides-carousel-section'),
  { ssr: true }
);

const IRLTourSection = dynamic(
  () => import('@/components/home/irl-tour-section'),
  { ssr: true }
);

const CityGuidesCoverSection = dynamic(
  () => import('@/components/home/city-guides-cover-section'),
  { ssr: true }
);

const GetInvolvedSection = dynamic(
  () => import('@/components/home/get-involved-section'),
  { ssr: true }
);

const ArtistCTA = dynamic(() => import('@/components/home/artist-cta'), {
  ssr: true,
});
// Temporarily hidden — re-enable import and JSX block below to restore
// const FooterHero = dynamic(() => import('@/components/layout/footer-hero'), {
//   ssr: true,
// });
const Footer = dynamic(() => import('@/components/layout/footer'), {
  ssr: true,
});

export const revalidate = 0;

export default async function Home() {
  let featuredEvent: HomepageFeaturedEvent | null = null;
  let featuredDiceEventId: string | null = null;
  try {
    [featuredEvent, featuredDiceEventId] = await Promise.all([
      getHomepageFeaturedEvent(),
      getFeaturedDiceEventId(),
    ]);
  } catch (error) {
    console.error('Failed to load featured event for homepage:', error);
  }

  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313] rounded-t-3xl xl:rounded-none">
      {/* Header - Fixed at top (outside overflow-hidden for Firefox compatibility) */}
      <Header variant="home" />

      <div className="overflow-x-hidden overflow-y-visible rounded-t-3xl xl:rounded-none">
        {/* Hero Section with WebGL Background - Full viewport */}
        <div className="relative w-screen">
          <Hero />
        </div>

        {/* Artist CTA Section */}
        <div className="py-0">
          <ArtistCTA />
        </div>

        {/* City Guides Cover Section */}
        <div className="py-0">
          <CityGuidesCoverSection />
        </div>

        {/* IRL Tour Section */}
        <div className="py-0">
          <IRLTourSection
            featuredEvent={featuredEvent}
            featuredDiceEventId={featuredDiceEventId}
          />
        </div>

        {/* City Guides Carousel Section */}
        <div className="py-0">
          <CityGuidesCarouselSection />
        </div>

        {/* Get Involved Section */}
        <div className="py-0">
          <GetInvolvedSection />
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
