import { NextRequest } from "next/server";
import { SyndicateClient } from "@syndicateio/syndicate-node";
import { v5 as uuidv5 } from 'uuid';

import { checkinAddress } from "@/lib/checkin";
import { DuplicateTransactionError } from "@syndicateio/syndicate-node/api/resources/transact";

export async function POST(req: NextRequest) {
  const { walletAddress, checkpoint } = await req.json();

  // This is a random namespace UUID for the specific event, its only used so if the same wallet address is used for multiple events, it will generate a different UUID for each event
  // This should be updated for each event if this code will be re-used across multiple events.
  const EVENT_NAMESPACE = "4ed8f9e4-041d-437b-8509-cd4d8f15dea9"
  const uuid = uuidv5(`${walletAddress}-${checkpoint}`, EVENT_NAMESPACE);

  try {
    const syndicate = new SyndicateClient({
      token: process.env.SYNDICATE_API_KEY as string,
    });

    const tx = await syndicate.transact.sendTransaction({
      requestId: uuid,
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
    // Returning a 200 here because the duplicate transaction error is expected
    if(e instanceof DuplicateTransactionError) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
