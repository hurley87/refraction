import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    // Validate required fields
    if (!name || !email || !message) {
      return apiError("Missing required fields", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Invalid email format", 400);
    }

    // Airtable configuration
    const AIRTABLE_BASE_ID2 = process.env.AIRTABLE_BASE_ID2;
    const AIRTABLE_TABLE_NAME =
      process.env.AIRTABLE_TABLE_NAME || "Contact Submissions";
    const AIRTABLE_PERSONAL_ACCESS_TOKEN =
      process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;

    // Debug logging
    console.log("Airtable Config:", {
      baseId: AIRTABLE_BASE_ID2 ? "Set" : "Missing",
      tableName: AIRTABLE_TABLE_NAME,
      personalAccessToken: AIRTABLE_PERSONAL_ACCESS_TOKEN ? "Set" : "Missing",
    });

    if (!AIRTABLE_BASE_ID2 || !AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      console.error("Missing Airtable configuration");
      return apiError("Server configuration error", 500);
    }

    // Prepare data for Airtable
    const currentDate = new Date();
    const airtableData = {
      records: [
        {
          fields: {
            Name: name,
            Email: email,
            Message: message,
            // Use date only format (YYYY-MM-DD) for Airtable date fields
            // If you need datetime, use: currentDate.toISOString()
            "Submission Date": currentDate.toISOString().split("T")[0],
            Source: "Website Contact Form",
          },
        },
      ],
    };

    // Send to Airtable
    console.log(
      "Sending data to Airtable:",
      JSON.stringify(airtableData, null, 2),
    );

    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID2}/${AIRTABLE_TABLE_NAME}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(airtableData),
      },
    );

    console.log("Airtable response status:", airtableResponse.status);
    console.log(
      "Airtable response headers:",
      Object.fromEntries(airtableResponse.headers.entries()),
    );

    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.text();
      console.error("Airtable API error:", {
        status: airtableResponse.status,
        statusText: airtableResponse.statusText,
        error: errorData,
        url: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID2}/${AIRTABLE_TABLE_NAME}`,
      });
      return apiError("Failed to save submission", 500);
    }

    const result = await airtableResponse.json();
    console.log("Successfully saved to Airtable:", result);

    // Ensure we have a valid result with records
    if (!result.records || result.records.length === 0) {
      console.error("Unexpected Airtable response structure:", result);
      return apiError("Unexpected response from Airtable", 500);
    }

    console.log("Returning success response with status 200");
    return apiSuccess({ id: result.records[0].id }, "Contact form submitted successfully");
  } catch (error) {
    console.error("Contact form submission error:", error);
    return apiError("Internal server error", 500);
  }
}
