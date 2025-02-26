import { NextRequest } from "next/server";
import { createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { checkinABI, checkinAddress } from "@/lib/checkin";
import { testPublicClient } from "@/lib/publicClient";

const chain = defineChain({
  id: 63821,
  name: "IRL",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.irl.syndicate.io"],
    },
  },
});

const walletClient = createWalletClient({
  chain,
  transport: http(),
});

export async function POST(req: NextRequest) {
  console.log("Adding checkpoint", req);
  try {
    const privateKey = process.env.SERVER_PRIVATE_KEY;

    if (!privateKey) {
      return new Response(
        JSON.stringify({ error: "Server private key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Add checkpoint with 2 points
    const { request } = await testPublicClient.simulateContract({
      account,
      address: checkinAddress,
      abi: checkinABI,
      functionName: "addCheckpoint",
      args: [BigInt(2)],
    });

    const hash = await walletClient.writeContract(request);

    console.log("Hash:", hash);

    return new Response(JSON.stringify({ success: true, hash }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error adding checkpoint:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred while adding checkpoint" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
