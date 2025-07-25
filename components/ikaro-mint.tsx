"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { ERC1155CreatorCoreABI } from "@/lib/contracts/Manifold/ERC1155CreatorCore";
import { MarketPlaceCoreABI } from "@/lib/contracts/Manifold/MarketPlaceCore";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  PublicClient,
} from "viem";
//import { sepolia } from "viem/chains";
import {  base } from "viem/chains";
import { useToast } from "@/hooks/use-toast";
import Auth from "./ikaro-auth";
import { Button } from "./ui/button";
import Image from "next/image";
import Link from "next/link";
import { ToastAction } from "./ui/toast";

export default function IkaroMint() {
  const { user } = usePrivy();
  const minterAccount = user?.wallet?.address as `0x${string}`;

  
/*********************************************   SEPOLIA TEST DATA   ******************************************************
  const creatorContract = "0x26bbea7803dcac346d5f5f135b57cf2c752a02be" as `0x${string}`; // sepolia manifold creator contract

  //const ikaroEditionContract = "0x75fde1ccc4422470be667642a9d2a7e14925c2d6" as `0x${string}`; // sepolia ikaro edition contract
  //const editionInstanceId = BigInt(4204538096); // app ID for ikaro edition on sepolia
  //const marketPlaceCoreContract = "0x5246807fB65d87b0d0a234e0F3D42374DE83b421" as `0x${string}`; // sepolia market place contract
  //const auctionInstanceId = BigInt(4206227696) ; // app ID for ikaro auction on sepolia
  //const ikaroAuctionContract = "0x64b7E24f9CD7c0E64B1AdfCe568a9f4aacb034DA" as `0x${string}`; // sepolia ikaro auction contract
  //const auctionListingId = 1349; // auction listing id for ikaro auction on sepolia
  //const ikaroEditionContract = "0x8a442d543edee974c7dcbf4f14454ec6ec671bee" as `0x${string}`; // base ikaro edition contract 
  const auctionURL = "https://manifold.xyz/@220136848/id/4206227696";
  const chain = sepolia;
   const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  }) as PublicClient; 
   ************************************************************************************************************/


  /* prod data*/
  const ikaroEditionContract = "0x52344cbbb2b6e59cd38b8d8771739a41c552c949" as `0x${string}`; //  ikaro edition contract  on base
  const editionInstanceId = BigInt(4205168880); // app ID for ikaro edition on base
  const marketPlaceCoreContract = "0xa8863bf1c8933f649e7b03Eb72109E5E187505Ea" as `0x${string}`; //  market place contract  on mainnet
  //const ikaroAuctionContract = "0x9109C9C752fd59FB3e7bAf24e6f7Ea4e3aAb0c0c" as `0x${string}`; //  ikaro auction contract  on mainnet
  const creatorContract = "0x26bbea7803dcac346d5f5f135b57cf2c752a02be" as `0x${string}`; //  manifold creator contract on base
  const auctionListingId = 1349
  const auctionURL = "https://gallery.manifold.xyz/0x9109c9c752fd59fb3e7baf24e6f7ea4e3aab0c0c/1";
  //const editionURL = "https://manifold.xyz/@occulted/id/4205168880";
  const chain = base;
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;


  
  // Helper function to convert wei to ETH
  const weiToEth = (wei: bigint): string => {
    const eth = Number(wei) / Math.pow(10, 18);
    return eth.toFixed(4);
  };

  const [isMinting, setIsMinting] = useState(false);
  const [isOpenEdition, setIsOpenEdition] = useState(true);
 
 
  const { wallets } = useWallets();
  const wallet = wallets.find((wallet) => (wallet.address as `0x${string}`) === minterAccount
  );

  
  const chainId = wallet?.chainId.split(":")[1];
  const { toast } = useToast();

  const [count, setCount] = useState(1);
  const [mintFee, setMintFee] = useState<bigint>(BigInt(500000000000000));
  const [mintPrice, setMintPrice] = useState<bigint>(BigInt(1100000000000000));
  const endDate = 1756252800; // Unix timestamp for Aug 25, 2025 00:00:00 UTC
  const [listingCurrentPrice, setListingCurrentPrice] = useState<bigint>(BigInt(0));
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const timeRemaining = endDate - now;
      
      if (timeRemaining > 0) {
        const days = Math.floor(timeRemaining / (24 * 60 * 60));
        const hours = Math.floor((timeRemaining % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((timeRemaining % (60 * 60)) / 60);
        const seconds = timeRemaining % 60;
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Calculate immediately
    calculateTimeLeft();
    
    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  useEffect(() => {
    const getMintFee = async () => {
      try {
        const fee = await publicClient.readContract({
          address: creatorContract,
          abi: ERC1155CreatorCoreABI,
          functionName: 'MINT_FEE',
        });
        setMintFee(fee as bigint);
      } catch {
        console.error("Error getting mint fee");
      }
    };
    getMintFee();
  }, [publicClient, creatorContract]);

    useEffect(() => {
    const getMintPrice = async () => {
      try {
        const claim = await publicClient.readContract({
          address: creatorContract,
          abi: ERC1155CreatorCoreABI,
          functionName: 'getClaim',
          args: [ikaroEditionContract, editionInstanceId],
        });

        // Type assertion to handle unknown type
        //console.log("claim", claim);
        const claimData = claim as { cost: bigint };
        setMintPrice(claimData.cost);
      } catch {
        console.error("Error getting price");
      }
    };
    getMintPrice();
  }, [publicClient, creatorContract, editionInstanceId]);

   useEffect(() => {
    const getListingCurrentPrice = async () => {
      try {
        const listingCurrentPrice = await publicClient.readContract({
          address: marketPlaceCoreContract,
          abi: MarketPlaceCoreABI,
          functionName: 'getListingCurrentPrice',
          args: [auctionListingId],
        });

        // Type assertion to handle unknown type
        console.log("listingCurrentPrice", listingCurrentPrice);
      
        setListingCurrentPrice(listingCurrentPrice as bigint);
      } catch {
        console.error("Error getting listing current price");
      }
    };
    getListingCurrentPrice();
  }, [publicClient, creatorContract]);

  const handleMint = async () => {
    setIsMinting(true);

    try {
      const ethereumProvider = (await wallet?.getEthereumProvider()) as any;

      const walletClient = await createWalletClient({
        account: minterAccount,
        chain,
        transport: custom(ethereumProvider),
      });
      let hash;
      if ( count > 1 ){
        console.log("ikarocontactAddress", ikaroEditionContract);
        console.log("instanceId", editionInstanceId);
        console.log("count", count);
        console.log("mintPrice", mintPrice);
        console.log("mintFee", mintFee);
        console.log("minterAccount", minterAccount);
        console.log("mintFee * BigInt(count)", mintFee * BigInt(count));
        hash = await walletClient.writeContract({
          address: creatorContract,
          abi: ERC1155CreatorCoreABI,
          functionName: 'mintBatch',
          args: [ikaroEditionContract, editionInstanceId, count, [] , [], minterAccount],
          value: mintFee * BigInt(count) + mintPrice * BigInt(count)
        });
      }
      else{
        console.log("ikarocontactAddress", ikaroEditionContract);
        console.log("instanceId", editionInstanceId);
        console.log("mintPrice", mintPrice);
        console.log("minterAccount", minterAccount);
        console.log("mintFee", mintFee);
        console.log("mintPrice ", mintPrice);
        hash = await walletClient.writeContract({
          address: creatorContract,
          abi: ERC1155CreatorCoreABI,
          functionName: 'mint',
          args: [ikaroEditionContract, editionInstanceId, 0, [], minterAccount],
          value: mintFee + mintPrice
        });
      }

      await publicClient.waitForTransactionReceipt({
        hash,
      });

      toast({
        title: "Minted!",
        description: "View transaction",
        action: (
          <Link target="_blank" href={`https://basescan.org/tx/${hash}`}>
            <ToastAction altText="Goto schedule to undo">View</ToastAction>
          </Link>
        ),
      });

      setIsMinting(false);
      setCount(1);
  
    } catch {
      console.error("Error minting");
      toast({
        title: "Error",
        description: "Error minting",
        variant: "destructive",
      });
      setIsMinting(false);
      return;
    }
  };


  const switchNetwork = async () => {
    if (!wallet) {
      toast({
        title: "Error",
        description: "Minting requires a wallet.",
        variant: "destructive",
      });
      return;
    }
    try {
      //switch to sepolia
      //await wallet?.switchChain(11155111);
      //switch to base
      await wallet?.switchChain(8453);
    } catch {
      console.error("Error switching network");
    }
  };



  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => Math.max(1, prev - 1));

  return (
    <Auth>
      <div className="flex flex-col lg:flex-row gap-8 py-6 w-full px-2 lg:px-4 rounded-xl">
        {/* Left Column - Single Image */}
        <div className="lg:w-2/3">
          <div className="relative w-full aspect-[4/3] lg:aspect-[16/9]">
            <Image 
              src={isOpenEdition ? "/images/ikaro/ikaro-openedition.png" : "/images/ikaro/ikaro-oneofone.png"} 
              alt="Ikaro Mint" 
              fill
              className="object-contain"
            />
          </div>
          <p className="mt-4 text-2xl text-black font-grotesk text-center">
            {isOpenEdition 
              ? "Fractured Entry, 2025"
              : "Within Abruption, 2025"
            }
          </p>
        </div>

        {/* Right Column - Four Rows */}
        <div className="lg:w-1/3 flex flex-col space-y-1 rounded-lg">
          {/* Row 1 - Title */}
          <div className="space-y-4 text-white">
            <h1 className="text-4xl font-inktrap">PCO</h1>
            <p className="text-2xl font-inktrap">IKARO CAVALCANTE</p>
          </div>

          {/* Row 2 - Price and Expiration */}
           <div className="space-y-4 text-white">
            <div className="bg-white text-black p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-inktrap">{isOpenEdition ? "Buy for" : "Auction"}</div>
                <div className="bg-white text-black px-3 py-1 rounded-full shadow-lg text-sm">
                  <span className="flex items-center gap-1">
                    {isOpenEdition ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                        ""
                    )}
                    {isOpenEdition ? (timeLeft.days > 0 
                      ? `${timeLeft.days}d ${timeLeft.hours.toString().padStart(2, '0')}:${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`
                      : timeLeft.hours > 0 
                        ? `${timeLeft.hours.toString().padStart(2, '0')}:${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`
                        : timeLeft.minutes > 0
                          ? `${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`
                          : timeLeft.seconds > 0
                            ? `${timeLeft.seconds}s`
                            : "Expired"
                    ) : ""}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-inktrap">
                {isOpenEdition ? weiToEth(mintPrice) + " Ξ / edition" : ".25 ETH"} 
              </div>
              <div className="text-md opacity-50 uppercase font-grotesk">
                {isOpenEdition ? " + mint fee" : "(minimum bid)"}
                
              </div>
            </div>
          </div>

          {/* Row 3 - Toggle Button */}
          <div className="flex items-center justify-start w-full rounded-xl bg-emerald-400 ">
            <div className="flex w-full relative">
              <button 
                className={`flex-1 py-2 font-inktrap text-sm rounded-xl transition-all ${
                  isOpenEdition 
                    ? 'text-black bg-emerald-400 hover:text-white hover:bg-black ' 
                    : '  bg-white text-black'
                }`}
                onClick={() => setIsOpenEdition(false)}
              >
                1/1
              </button>
              <button 
                className={`flex-1 py-2  font-inktrap text-sm rounded-xl transition-all ${
                  isOpenEdition 
                    ? 'bg-white text-black ' 
                    : 'text-black hover:bg-black hover:text-white  '
                }`}
                onClick={() => setIsOpenEdition(true)}
              >
                Open Edition
              </button>
            </div>
          </div>

          {/* Row 4 & 5 - Combined Quantity Selector and Mint Button */}
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div>
              {isOpenEdition ? (
                
                // chainId !== "11155111" ? (
                chainId !== "8453" ? (
                  <Button
                    size="lg"
                    className="bg-yellow-500 hover:bg-yellow-400 text-black w-full"
                    onClick={switchNetwork}
                  >
                    Switch Network
                  </Button>
                ) : (
                  <Button 
                    className="bg-black text-white rounded-full hover:bg-black/80 w-full text-xl font-grotesk flex items-center justify-between px-6"
                    onClick={handleMint}
                  >
                    {isMinting ? (
                      "Minting..."
                    ) : (
                      <>
                        <span>Buy Now</span>
                        <span>{weiToEth(BigInt(count)*(mintPrice+mintFee))} ETH</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </>
                    )}
                  </Button>
                )
              ) : (
                 <Button 
                    className="bg-black text-white rounded-full hover:bg-black/80 w-full text-xl font-grotesk flex items-center justify-between px-6"
                  onClick={() => window.open(auctionURL, '_blank')}
                >
                  <span>Place Bid</span>
                        {listingCurrentPrice > 0 ? (<span>{Number(weiToEth(listingCurrentPrice))}  ETH</span>) : ""}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                </Button>
              )}
            </div>
            {/* Quantity Selector */}
            {isOpenEdition && (
              <div className="flex items-center justify-center">
                <div className="bg-white rounded-xl flex w-full overflow-hidden">
                  <button 
                    onClick={decrement}
                    className="w-1/4 py-2 text-black hover:bg-gray-100 text-xl font-mono transition-all bg-white"
                  >
                    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      -
                    </div>
                  </button>
                  <div className="w-2/4 py-2 bg-white flex items-center justify-center border-r rounded-full border-2 border-black">
                    <span className="text-xl font-mono text-black">{count}</span>
                  </div>
                  <button 
                    onClick={increment}
                    className="w-1/4 py-2 text-black hover:bg-gray-100 text-xl font-mono transition-all bg-white"
                  >
                    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      +
                    </div>
                  </button>
                </div>
              </div>

              
            )}

            {/* Mint Button */}
            
          </div>

          {/* Row 6 - Description and about artist */}
         
            <div className="space-y-4 bg-white text-black p-6 rounded-xl shadow-lg">
              {!isOpenEdition ? (
                <>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px]">📖 DETAILS</span><br/>
                    <b>Within Abruption, 2025</b><br/><br/>
                    Digital 3D artwork – sculpture, lighting and composition by Ikaro Cavalcante (occulted)<br/><br/>
                    Suspended between rupture and emergence, <b>Within Abruption</b> appears as the first weapon in the game, while also marking an inaugural moment. It is not merely a combat object, but an artifact of passage, a trace from a time being reconfigured, traversed by memory and projection.<br/><br/>  
                    The figure, rising like a totem over a terrain of mist and shadow, seems to hold the precise moment in which something begins to shift. The suspended, unfinished body carries a subtle tension, as if inhabiting the threshold suggested by the game&apos;s title, Between the Abyss and Redemption.<br/><br/>
                    Here, the scythe is not just an extension of the body, but a symbolic continuation of its own instability. A form that cuts through space not to wound, but to open fractures, suggest directions, and carve out moments of stillness.<br/><br/>
                    The work navigates contrasts: lightness and rigidity, silence and impulse. In this piece, Ikaro&apos;s sculptural gesture gives shape not only to a weapon, but to a state of transition. A fragment of perception. A delicate artifact from a world still in the making.<br/><br/>
                    As the game&apos;s first asset, <b>Within Abruption</b>  does not begin a narrative. It signals a point of inflection. From this displacement, everything begins to breathe.
                  </p>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px]">👤 ABOUT THE ARTIST</span><br/>
                    Ikaro Cavalcante is a Brazilian Non-binary Artist focused on CGI, having gone through graphic design, tattoo and performance. Digi.gxl and Inserto member with works for MAI.art, Coeval, Fact, Love mag, AVYSS, i-D.
                  </p>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px]">🌐 WEBSITE</span><br/>
                    <a href="https://linktr.ee/occulted" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                      <span>https://linktr.ee/occulted</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </p>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px] flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      FOLLOW
                    </span><br/>
                    <div className="flex gap-2 mt-2">
                      <a href="https://twitter.com/occult3d" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                        <span>Twitter</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                      <a href="https://www.instagram.com/occulted" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                        <span>Instagram</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                       <a href="https://www.occulted.xyz" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                        <span>Website</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px]">📖 DETAILS</span><br/>
                    <b>Fractured Entry, 2025</b><br/><br/>
                    Digital artwork by Ikaro Cavalcante (occulted)<br/><br/>
                    The first revealed fragment from the universe of <b>Between the Abyss and Redemption</b>, this piece functions as an inaugural fissure. <b>Fractured Entry</b> revisits the silhouette of the scythe as both a graphic and symbolic gesture. A form that cuts through emptiness to carve a passage. It continues the artist&apos;s visual research into contrast, text, and figure, offering a broken, partial, yet ritualistic entry into a world in motion.
                  </p>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px]">👤 ABOUT THE ARTIST</span><br/>
                    Ikaro Cavalcante is a Brazilian Non-binary Artist focused on CGI, having gone through graphic design, tattoo and performance. Digi.gxl and Inserto member with works for MAI.art, Coeval, Fact, Love mag, AVYSS, i-D.
                  </p>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px]">🌐 WEBSITE</span><br/>
                    <a href="https://linktr.ee/occulted" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                      <span>https://linktr.ee/occulted</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </p>
                  <p className="text-lg font-grotesk leading-relaxed">
                    <span className="text-[11px] flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      FOLLOW
                    </span><br/>
                    <div className="flex gap-2 mt-2">
                      <a href="https://twitter.com/occult3d" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                        <span>Twitter</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                      <a href="https://www.instagram.com/occulted" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                        <span>Instagram</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                       <a href="https://www.occulted.xyz" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-gray-900/10 text-black rounded-full px-4 py-2 hover:bg-gray-100">
                        <span>Website</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>
                  </p>
                </>
              )}
            </div>
        </div>
      </div>
    </Auth>
  );
}
