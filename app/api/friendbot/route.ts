import { NextRequest, NextResponse } from "next/server";

/**
 * Friendbot API route for funding test accounts on local/testnet networks
 * This proxies requests to the appropriate friendbot service
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("addr");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 },
    );
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
      return NextResponse.json(
        { error: `Friendbot not available for network: ${network}` },
        { status: 400 },
      );
  }

  try {
    const response = await fetch(friendbotUrl);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Friendbot proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fund account" },
      { status: 500 },
    );
  }
}
