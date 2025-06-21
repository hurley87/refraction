import { NextRequest, NextResponse } from "next/server";

type UserData = {
  username: string;
};

export async function GET(
  request: NextRequest
): Promise<NextResponse<UserData | { error: string }>> {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.zora.co/discover/user/${address}`
    );
    const data = await response.json();
    const username = data.user_profile?.username || "";
    const avatar = data.user_profile?.avatar || "";

    return NextResponse.json({ username, avatar });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
