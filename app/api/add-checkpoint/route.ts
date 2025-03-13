import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  console.log("Adding checkpoint", req);
  try {
    const token = process.env.SYNDICATE_API_KEY;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Syndicate API token not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    // Prepare the request payload for Syndicate API
    const payload = {
      projectId: "cc0c9093-250c-476c-b316-15b2be5bbf32",
      contractAddress: "0x0Cd40B41fd2cA8b91164B5888D3e2e2573D83B60",
      chainId: 63821,
      functionSignature: "addCheckpoint(uint256 points)",
      args: {
        points: 2,
      },
    };

    // Make the API request to Syndicate
    const response = await fetch(
      "https://api.syndicate.io/transact/sendTransaction",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Syndicate API error:", errorData);
      return new Response(
        JSON.stringify({
          error: "Failed to send transaction via Syndicate API",
          details: errorData,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Transaction sent:", data);

    return new Response(JSON.stringify({ success: true, data }), {
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
