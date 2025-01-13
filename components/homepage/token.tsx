"use client";
import { getIPSFData } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Creator from "./creator";
import { getPremintPricePerToken } from "@zoralabs/protocol-sdk";

export const Token = ({
  tokenId,
  collectorClient,
}: {
  tokenId: number;
  collectorClient: any;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [name, setName] = useState<string>("");
  const [image, setImage] = useState<string>("");
  const [creator, setCreator] = useState<`0x${string}` | null>(null);
  

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const { token } = await collectorClient.getToken({
          tokenContract: "0xec6f57cb913cdb21ed021d22ad2f47e67e59ac09",
          tokenId: tokenId,
          mintType: "1155",
        });

        const tokenURI = await getIPSFData(
          token.tokenURI.replace("ipfs://", "")
        );
        const name = tokenURI.name;
        const image = `https://ipfs.decentralized-content.com/ipfs/${tokenURI.image.replace(
          "ipfs://",
          ""
        )}`;
        

        
        
        setName(name.toUpperCase());
        setImage(image);
        setCreator(token.creator); 
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading tokens</div>;

  return (
    <div className="flex flex-col gap-6 bg-[#DBDFF2]/50 p-4 sm:p-8 rounded-lg max-w-[600px] font-sans ">
      <img src={image} alt={name} />
      <div className="text-2xl">{name}</div>

      {creator && <Creator creator={creator} />}
      <div className="flex flex-row gap-6 justify-between">
        <div className="flex">
          <Button
            size="lg"
            className="bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-900 inline-block text-transparent bg-clip-text uppercase bg-[#FFFFFF]] hover:bg-[#DDDDDD]/90  sm:w-auto"
          >
            Mint • 0.15ETH
          </Button>
        </div>
        <div className="flex pt-2">
          <div className="text-sm ju text-[#6101FF]">LEARN MORE </div>
          &nbsp;
          <img src="/images/arrow.png" className="w-4 h-4" alt="arrow" />
        </div>
      </div>
    </div>
  );
};
