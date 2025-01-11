"use client";
import { getIPSFData } from "@/lib/utils";
import { useEffect, useState } from "react";
import Creator from "./creator";

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

        setName(name);
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
    <div className="flex flex-col gap-6 bg-[#DBDFF2]/50 p-4 sm:p-8 rounded-lg max-w-[600px]">
      <img src={image} alt={name} />
      <div>{name}</div>
      {creator && <Creator creator={creator} />}
    </div>
  );
};
