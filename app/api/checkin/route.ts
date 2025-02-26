import { NextRequest } from "next/server";
import { SyndicateClient } from "@syndicateio/syndicate-node";

import { checkinAddress } from "@/lib/checkin";

export async function POST(req: NextRequest) {
  const { walletAddress, checkpoint } = await req.json();

  console.log(walletAddress, checkpoint);

  try {
    const syndicate = new SyndicateClient({
      token: process.env.SYNDICATE_API_KEY as string,
    });

    // TODO: the syndicate broadcasting wallet address would need to be allowlisted on the contract
    // DEV: This likely wont work due to the current contract setup uses onlyOwner check
    const tx = await syndicate.transact.sendTransaction({
      projectId: process.env.SYNDICATE_PROJECT_ID as string,
      contractAddress: checkinAddress,
      chainId: 63821,
      functionSignature: "checkIn(address user, uint256 checkpointId)",
      args: {
        user: walletAddress,
        checkpointId: checkpoint,
      },
    });

    console.log(tx);

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
