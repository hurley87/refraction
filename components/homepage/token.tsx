"use client";
import { getIPSFData } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Creator from "./creator";
import Link from "next/link";

export const Token = ({
  tokenId,
  collectorClient,
  tokenContract,
}: {
  tokenId: number;
  collectorClient: any;
  tokenContract: string;
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
          tokenContract,
          tokenId,
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
    <div className="flex flex-col gap-3 bg-[#ffffff] p-4 sm:p-8 rounded-lg max-w-[600px] font-sans h-full">
      <div
        className="w-full aspect-square relative rounded-lg overflow-hidden"
        style={{
          backgroundImage: `url(${image})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="text-2xl">{name}</div>

      {creator && <Creator creator={creator} />}
      <div className="flex flex-row gap-6 justify-between mt-auto">
        <div className="flex">
          <Link
            target="_blank"
            href={`https://zora.co/collect/base:${tokenContract}/${tokenId}?referrer=0xbD78783a26252bAf756e22f0DE764dfDcDa7733c`}
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#EE95BC] to-[#ED2D24]  inline-block text-black  uppercase  hover:bg-[#DDDDDD]/90  sm:w-auto"
            >
              Mint
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
