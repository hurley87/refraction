import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return apiError("Invalid address", 400);
  }

  try {
    const response = await fetch(
      `https://api.zora.co/discover/user/${address}`
    );
    const data = await response.json();
    const username = data.user_profile?.username || "";
    const avatar = data.user_profile?.avatar || "";

    return apiSuccess({ username, avatar });
  } catch {
    return apiError("Failed to fetch user data", 500);
  }
}
