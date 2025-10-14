import Header from "@/components/header";
import Hero from "@/components/hero";
import ArtistCTA from "@/components/artist-cta";
import FooterHero from "@/components/footer-hero";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#131313]">
      {/* Hero Section with WebGL Background - Full viewport */}
      <div className="relative h-screen w-screen">
        <Hero />

        {/* Header - Positioned absolutely on top of hero */}
        <div className="absolute top-0 left-0 right-0 z-20 p-0 md:p-4">
          <Header />
        </div>
      </div>

      {/* Artist CTA Section */}
      <ArtistCTA />

      {/* Footer Hero Section with WebGL Background */}
      <FooterHero />

      {/* Footer */}
      <Footer />
    </div>
  );
}
