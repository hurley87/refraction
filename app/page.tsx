import dynamic from "next/dynamic";
import Header from "@/components/layout/header";
import Hero from "@/components/hero";

// Lazy load below-the-fold components for better initial load performance
const MapSection = dynamic(() => import("@/components/map/map-section"), {
  ssr: true,
});
const Partners = dynamic(() => import("@/components/partners"), {
  ssr: true,
});
const ArtistCTA = dynamic(() => import("@/components/artist-cta"), {
  ssr: true,
});
const FooterHero = dynamic(() => import("@/components/layout/footer-hero"), {
  ssr: true,
});
const Footer = dynamic(() => import("@/components/layout/footer"), {
  ssr: true,
});

export default function Home() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313] rounded-t-3xl">
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
