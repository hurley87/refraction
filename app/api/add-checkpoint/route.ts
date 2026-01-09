import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  console.log("Adding checkpoint", req);
  try {
    const token = process.env.SYNDICATE_API_KEY;

    if (!token) {
      return apiError("Syndicate API token not configured", 500);
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
      // Map non-standard status codes to valid apiError status codes
      const status =
        response.status === 400
          ? 400
          : response.status === 404
            ? 404
            : response.status === 429
              ? 429
              : 500;
      return apiError(
        `Failed to send transaction via Syndicate API: ${JSON.stringify(errorData)}`,
        status,
      );
    }

    const data = await response.json();
    console.log("Transaction sent:", data);

    return apiSuccess(data);
  } catch (e) {
    console.error("Error adding checkpoint:", e);
    return apiError("An error occurred while adding checkpoint", 500);
  }
}
