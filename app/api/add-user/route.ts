import { NextRequest, NextResponse } from "next/server";

// Create a new user record in Airtable
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const { id, createdAt, ethAddress, email } = await request.json();

    if (!id || !createdAt || !ethAddress || !email) {
      return NextResponse.json(
        {
          error:
            "Missing required field(s). id, createdAt, ethAddress and email are mandatory.",
        },
        { status: 400 },
      );
    }

    // Read Airtable credentials from env
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = "Users";

    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable credentials are not configured." },
        { status: 500 },
      );
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`;

    // Build Airtable payload
    const payload = {
      records: [
        {
          fields: {
            ID: id,
            "Created at": createdAt,
            "Ethereum account": ethAddress,
            "Email account": email,
          },
        },
      ],
    };

    // Send request to Airtable API
    const airtableRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await airtableRes.json();

    if (!airtableRes.ok) {
      return NextResponse.json({ error: data }, { status: airtableRes.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Airtable user creation error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Airtable" },
      { status: 500 },
    );
  }
}
