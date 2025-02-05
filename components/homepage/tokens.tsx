"use client";
import { publicClient } from "@/lib/publicClient";
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { useEffect, useState } from "react";
import { Token } from "./token";

export const Tokens = () => {
  const [tokens, setTokens] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const chainId = 8453;
  const collectorClient = createCollectorClient({
    chainId,
    publicClient,
  });

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const { tokens } = await collectorClient.getTokensOfContract({
          tokenContract: "0xec6f57cb913cdb21ed021d22ad2f47e67e59ac09",
        });

        setTokens(tokens);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []); // Empty dependency array means this runs once on mount

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading tokens</div>;

  console.log(tokens);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-start items-center p-4 sm:p-8 bg-[#DBDFF2]/50">
        DIG Shibuya Mints
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tokens.map((token: any) => (
          <Token
            key={token.token.tokenId}
            tokenId={token.token.tokenId}
            collectorClient={collectorClient}
          />
        ))}
      </div>
    </div>
  );
};
