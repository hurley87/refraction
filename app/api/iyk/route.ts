import { NextResponse } from "next/server";

export async function PATCH() {
  try {
    const res = await fetch("https://api.iyk.app/chips", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-iyk-api-key": process.env.IYK_KEY!,
      },
      body: JSON.stringify({
        tagUIDs: ["1260683545350288"],
        updates: {
          redirectUrl: "https://www.irl.energy/checkpoints/0",
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Response body:", errorBody);
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("COOL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update IYK" },
      { status: 500 }
    );
  }
}
