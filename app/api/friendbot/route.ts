import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";

/**
 * Friendbot API route for funding test accounts on local/testnet networks
 * This proxies requests to the appropriate friendbot service
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("addr");

  if (!address) {
    return apiError("Address parameter is required", 400);
  }

  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "TESTNET";

  let friendbotUrl: string;
  switch (network) {
    case "LOCAL":
      // For local, you'd typically have a local friendbot running
      // This is a placeholder - adjust based on your local setup
      friendbotUrl = `http://localhost:8000/friendbot?addr=${address}`;
      break;
    case "FUTURENET":
      friendbotUrl = `https://friendbot-futurenet.stellar.org/?addr=${address}`;
      break;
    case "TESTNET":
      friendbotUrl = `https://friendbot.stellar.org/?addr=${address}`;
      break;
    default:
      return apiError(`Friendbot not available for network: ${network}`, 400);
  }

  try {
    const response = await fetch(friendbotUrl);
    const data = await response.json();
    // Preserve upstream status code for friendbot response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Friendbot proxy error:", error);
    return apiError("Failed to fund account", 500);
  }
}
