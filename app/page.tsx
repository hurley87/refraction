import Header from "@/components/header";
import Hero from "@/components/hero";
import ArtistCTA from "@/components/artist-cta";
import Partners from "@/components/partners";
import MapSection from "@/components/map-section";
import Footer from "@/components/footer";
import FooterHero from "@/components/footer-hero";

export default function Home() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313] rounded-3xl">
      {/* Header - Fixed at top (outside overflow-hidden for Firefox compatibility) */}
      <Header />

      <div className="overflow-hidden rounded-3xl">

      {/* Hero Section with WebGL Background - Full viewport */}
      <div className="relative h-screen w-screen">
        <Hero />
      </div>
      {/* Map Section with GSAP Scroll Transitions */}
      <div className="py-16 md:py-24" data-section="map">
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
