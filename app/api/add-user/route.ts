import { NextRequest, NextResponse } from "next/server";

// Create a new user record in Airtable
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const { createdAt, email } = await request.json();

    if (!createdAt || !email) {
      return NextResponse.json(
        {
          error:
            "Missing required field(s). createdAt and email are mandatory.",
        },
        { status: 400 },
      );
    }

    // Read Airtable credentials from env
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    // Allow overriding the Airtable table name via env; fall back to the default "IRL"
    const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME ?? "IRL";

    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable credentials are not configured." },
        { status: 500 },
      );
    }

    // Use encodeURIComponent to safely handle spaces or special characters in the table name
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

    // Build Airtable payload
    const payload = {
      records: [
        {
          fields: {
            "Created at": createdAt,
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
