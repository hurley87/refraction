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
import { sepolia } from "viem/chains";
import { useToast } from "@/hooks/use-toast";
import Auth from "./auth";
import { Button } from "./ui/button";
import Image from "next/image";
import Link from "next/link";
import { ToastAction } from "./ui/toast";

export default function IkaroMint() {
  const { user, login } = usePrivy();
  const minterAccount = user?.wallet?.address as `0x${string}`;

  /* test specific data */ 
  const creatorContract = "0x26bbea7803dcac346d5f5f135b57cf2c752a02be" as `0x${string}`; // sepolia manifold creator contract
  
  const ikaroEditionContract = "0x75fde1ccc4422470be667642a9d2a7e14925c2d6" as `0x${string}`; // sepolia ikaro edition contract
  const editionInstanceId = BigInt(4204538096); // app ID for ikaro edition on sepolia
  const marketPlaceCoreContract = "0x5246807fB65d87b0d0a234e0F3D42374DE83b421" as `0x${string}`; // sepolia market place contract
  const auctionInstanceId = BigInt(4206227696) ; // app ID for ikaro auction on sepolia
  const ikaroAuctionContract = "0x64b7E24f9CD7c0E64B1AdfCe568a9f4aacb034DA" as `0x${string}`; // sepolia ikaro auction contract
  const auctionListingId = 1349; // auction listing id for ikaro auction on sepolia
  //const ikaroEditionContract = "0x8a442d543edee974c7dcbf4f14454ec6ec671bee" as `0x${string}`; // base ikaro edition contract 


  const [isMinting, setIsMinting] = useState(false);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  }) as PublicClient;
 
  const { wallets } = useWallets();
  const wallet = wallets.find((wallet) => (wallet.address as `0x${string}`) === minterAccount
  );
  const chain = sepolia;
  const chainId = wallet?.chainId.split(":")[1];
  const { toast } = useToast();

  const [count, setCount] = useState(1);
  const [mintFee, setMintFee] = useState<bigint>(BigInt(500000000000000));
  const [mintPrice, setMintPrice] = useState<bigint>(BigInt(0));
  const [listingCurrentPrice, setListingCurrentPrice] = useState<bigint>(BigInt(0));
  const [listing, setListing] = useState<any>(null);

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

  useEffect(() => {
    const getListing = async () => {
      try {
         const listing = await publicClient.readContract({
          address: marketPlaceCoreContract,
          abi: MarketPlaceCoreABI,
          functionName: 'getListing',
          args: [auctionListingId],
        });

        // Type assertion to handle unknown type
        console.log(listing);
      
        setListing(listing as string[]);
      } catch {
        console.error("Error getting listing data");
      }
    };
    getListing();
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
          <Link target="_blank" href={`https://sepolia.etherscan.io/tx/${hash}`}>
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
      await wallet?.switchChain(11155111);
    } catch {
      console.error("Error switching network");
    }
  };



  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => Math.max(1, prev - 1));

  if (!user) {
    return (
      <Button
        className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 w-full max-w-4xl text-xl font-inktrap"
        onClick={login}
      >
        Get Started
      </Button>
    );
  }

  return (
    <Auth>
      <div className="flex flex-col items-center justify-center py-6 w-full">
        <div className="w-full space-y-4">
          <Image src="/images/ikaro.png" alt="Ikaro Mint" width={1272} height={618} />
          <h1 className="text-4xl font-inktrap">PCO BY IKARO CAVALCANTE  </h1>
          <p className="text-lg">On June 26 at Public Records NYC, Serpentine and ArtDAO team up with Refraction to debut the first digital artworks from Brazilian multimedia artist     Ikaro Cavalcante: a video game developed through PCO, Serpentine&apos;s creative ownership protocol. The artwork will be available as both a 1/1 and an open edition mint, with each purchase unlocking $IRL points—culture&apos;s on-chain rewards system. The launch will take place during RESET, a full-venue takeover powered by IRL, featuring music from INVT, Ash Lauryn, and more.
          </p>
          
          <div className="flex items-center justify-center mb-4">
            <div className="flex border border-[#F24405] rounded-lg overflow-hidden">
              <button 
                onClick={decrement}
                className="w-12 h-8 bg-black text-[#F24405] hover:bg-black/70 text-lg  font-hmalpha border-r border-[#F24405]"
              >
                -
              </button>
              
              <button 
                onClick={increment}
                className="w-12 h-8 bg-black text-[#F24405] hover:bg-black/70  font-hmalpha text-lg "
              >
                +
              </button>
              <div className="w-16 h-8 bg-transparent flex items-center justify-center border-r border-[#F24405]">
                <span className="text-lg font-mono">{count}</span>
              </div>
            </div>
          </div>
          {chainId !== "11155111" ? (
            <Button
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-400 text-black"
              onClick={switchNetwork}
            >
              Switch Network
            </Button>
                    ) : (
            <Button 
              className="bg-[#ff0000] text-blackrounded-lg hover:bg-black hover:text-white w-full max-w-4xl text-xl font-inktrap"
              onClick={handleMint}
            >
              {isMinting ? "Minting..." : "Buy Now"}
          </Button>
            )}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-6 w-full">
        <div className="w-full space-y-4">
          <Image src="/images/ikaro.png" alt="Ikaro Mint" width={1272} height={618} />
          <h1 className="text-4xl font-inktrap">1/1 BY IKARO CAVALCANTE  </h1>
          <p className="text-lg">On June 26 at Public Records NYC, Serpentine and ArtDAO team up with Refraction to debut the first digital artworks from Brazilian multimedia artist     Ikaro Cavalcante: a video game developed through PCO, Serpentine&apos;s creative ownership protocol. The artwork will be available as both a 1/1 and an open edition mint, with each purchase unlocking $IRL points—culture&apos;s on-chain rewards system. The launch will take place during RESET, a full-venue takeover powered by IRL, featuring music from INVT, Ash Lauryn, and more.
          </p>
          
      

          <Button className="bg-[#ff0000] text-blackrounded-lg hover:bg-black hover:text-white w-full max-w-4xl text-xl font-inktrap">
            Buy Now
          </Button>
        </div>
      </div>
    </Auth>
  );
}
