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
      <div className="overflow-hidden rounded-3xl">
      {/* Hero Section with WebGL Background - Full viewport */}
      <div className="relative h-screen w-screen">
        <Hero />

        {/* Header - Positioned absolutely on top of hero */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>
      </div>
      {/* Map Section with GSAP Scroll Transitions */}
      <div className="py-16 md:py-24">
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
