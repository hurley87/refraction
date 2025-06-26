"use client";

import Image from "next/image";

const partners = [
  { name: "Allships", logo: "/images/partners/Allships logo white.png" },
  { name: "Aptos", logo: "/images/partners/Aptos_Primary_WHT.png" },
  { name: "Arroz Estudios", logo: "/images/partners/Arroz Estudios white logo.png" },
  { name: "Arweave", logo: "/images/partners/arweave.org logotype light@2x.png" },
  { name: "Art Blocks", logo: "/images/partners/Art Blocks light logo.png" },
  { name: "Black Hole Experience", logo: "/images/partners/Black Hole Experience white logo.png" },
  { name: "Decrypt", logo: "/images/partners/Decrypt white logo.png" },
  { name: "Fact London", logo: "/images/partners/Fact London white logo.png" },
  { name: "Future of Cities", logo: "/images/partners/Future of Cities white logo.png" },
  { name: "Galxe", logo: "/images/partners/Galxe_Logo_Wordmark_White.png" },
  { name: "Ledger", logo: "/images/partners/LEDGER-WORDMARK-WHITE-RGB.png" },
  { name: "Livepeer", logo: "/images/partners/Livepeer white logo.png" },
  { name: "LUKSO", logo: "/images/partners/LUKSO_logo white.svg" },
  { name: "Mutek", logo: "/images/partners/Mutek white logo.png" },
  { name: "Near", logo: "/images/partners/Near white logo.png" },
  { name: "New Museum", logo: "/images/partners/New Museum white logo.png" },
  { name: "OpenSea", logo: "/images/partners/Opensea white logo.png" },
  { name: "Polygon", logo: "/images/partners/Polygon Primary light.png" },
  { name: "Public Records", logo: "/images/partners/Public Records white logo.png" },
  { name: "Rainbow Discoclub", logo: "/images/partners/Rainbow Discoclub white logo.png" },
  { name: "Reown", logo: "/images/partners/reown-logo.svg" },
  { name: "Resident Advisor", logo: "/images/partners/Resident Advisor white logo.png" },
  { name: "Rihzome", logo: "/images/partners/Rihzome logo.png" },
  { name: "Rodeo", logo: "/images/partners/Rodeo white logo.png" },
  { name: "Rug Radio", logo: "/images/partners/rug-radio-seeklogo white.svg" },
  { name: "Serpentine", logo: "/images/partners/Serpentine white logo..png" },
  { name: "Standard Time", logo: "/images/partners/Standard Time white logo.png" },
  { name: "SxSW", logo: "/images/partners/SxSW white logo.png" },
  { name: "Syndicate", logo: "/images/partners/syndicate logo white.png" },
  { name: "The Lot Radio", logo: "/images/partners/The Lot Radio white logo.png" },
  { name: "TSA+", logo: "/images/partners/TSA+Logo.jpg" },
  { name: "WalletConnect", logo: "/images/partners/walletconnect white.svg" },
  { name: "Zora", logo: "/images/partners/Zora Logo White.png" },
];

export default function Partners() {
  return (
    <section className="py-20 bg-transparent items-center justify-center">
      <div className="container mx-auto px-4 max-w-7xl flex flex-col items-center justify-center">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-inktrap text-black mb-6">
            Rewards Coming Soon
          </h2>
          
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-6 lg:gap-8 items-center mb-16 justify-center w-full max-w-6xl">
          {partners.map((partner, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div className="flex items-center justify-center p-6 bg-transparent rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 ">
                <div className="relative w-full h-32 flex items-center justify-center">
                  {/* Partner Logo */}
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-24 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Image
                          src={partner.logo}
                          alt={partner.name}
                          width={128}
                          height={96}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            // Hide the image if it fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <p className="text-xs font-grotesk text-white font-medium leading-tight">
                       
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-lg text-gray-600 font-grotesk mb-6 max-w-2xl mx-auto">
            Join dozens of companies already using our platform to transform their digital presence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
                onClick={() => {
                    window.open("mailto:info@refractionfestival.com", "_blank");
                }}
                className="bg-black text-white px-8 py-4 rounded-full font-inktrap hover:bg-gray-800 transition-colors duration-300 shadow-lg hover:shadow-xl">
              Become a Partner
            </button>
          </div>
        </div>
      </div>
    </section>
  );
} 