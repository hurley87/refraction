import { NextRequest } from "next/server";
import { getCheckinByAddress, insertCheckin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { walletAddress, email } = await req.json();
  console.log(walletAddress);

  try {
    const checkin = await getCheckinByAddress(walletAddress);

    console.log(checkin);

    if (checkin && checkin.length > 0) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await insertCheckin({
      address: walletAddress,
      email,
    });

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
