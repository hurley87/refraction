import Header from "@/components/header";
import Hero from "@/components/hero";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#131313]">
      {/* Hero Section with WebGL Background - Full viewport */}
      <Hero />

      {/* Header - Positioned absolutely on top of hero */}
      <div className="absolute top-0 left-0 right-0 z-20 p-0 md:p-4">
        <Header />
      </div>
    </div>
  );
}
