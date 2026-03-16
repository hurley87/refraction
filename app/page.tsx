import dynamic from 'next/dynamic';
import Header from '@/components/layout/header';
import Hero from '@/components/home/hero';

// Lazy load below-the-fold components for better initial load performance
const MapSection = dynamic(() => import('@/components/map/map-section'), {
  ssr: true,
});
const WhatYouGetSection = dynamic(
  () => import('@/components/home/what-you-get-section'),
  { ssr: true }
);
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
 
const Partners = dynamic(() => import('@/components/partners/partners'), {
  ssr: true,
});
const ArtistCTA = dynamic(() => import('@/components/home/artist-cta'), {
  ssr: true,
});
const FooterHero = dynamic(() => import('@/components/layout/footer-hero'), {
  ssr: true,
});
const Footer = dynamic(() => import('@/components/layout/footer'), {
  ssr: true,
});

export default function Home() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313]  rounded-t-3xl">
      {/* Header - Fixed at top (outside overflow-hidden for Firefox compatibility) */}
      <Header />

      <div className="overflow-hidden rounded-t-3xl">
        {/* Hero Section with WebGL Background - Full viewport */}
        <div className="relative h-screen w-screen">
          <Hero />
        </div>
        {/* Map Section with GSAP Scroll Transitions */}
        <div className="pt-0 pb-16 md:py-24" data-section="map">
          <MapSection />
        </div>

        {/* City Guides Cover Section */}
        <div className="py-0">
          <CityGuidesCoverSection />
        </div>

        {/* What You Get Section */}
        <div className="py-0">
          <WhatYouGetSection />
        </div>

        {/* Check-Ins Fund Culture Section — temporarily hidden, re-enable when needed */}
        {/* <div className="py-0">
          <CheckInsFundCultureSection />
        </div> */}

        {/* City Guides Carousel Section */}
        <div className="py-0">
          <CityGuidesCarouselSection />
        </div>

        {/* IRL Tour Section */}
        <div className="py-0">
          <IRLTourSection />
        </div>

        {/* Get Involved Section */}
        <div className="py-0">
          <GetInvolvedSection />
        </div>

        {/* Partners Section */}
        <div className="py-16 md:py-24">
          <Partners />
        </div>

        {/* Artist CTA Section */}
        <div className="py-16 md:py-24">
          <ArtistCTA />
        </div>

        {/* Footer Hero Section with WebGL Background */}
        <div className="py-16 md:py-24">
          <FooterHero />
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
