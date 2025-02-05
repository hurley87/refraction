import { NextRequest } from "next/server";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { checkinABI, checkinAddress } from "@/lib/checkin";
import { testPublicClient } from "@/lib/publicClient";
import { baseSepolia } from "viem/chains";

const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_QUICKNODE),
});

export async function POST(req: NextRequest) {
  const { walletAddress, checkpoint } = await req.json();

  console.log(walletAddress, checkpoint);

  try {
    const privateKey = process.env.SERVER_PRIVATE_KEY;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Add to allowlist
    const { request }: any = await testPublicClient.simulateContract({
      account,
      address: checkinAddress,
      abi: checkinABI,
      functionName: "checkIn",
      args: [walletAddress, checkpoint],
    });

    await walletClient.writeContract(request);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
