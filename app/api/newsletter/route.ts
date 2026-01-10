import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email) {
      return apiError('Email is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError('Invalid email format', 400);
    }

    // Airtable configuration
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_USERS_ID;
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_USERS_NEWSLETTER_TABLE || 'Newsletter Subscribers';
    const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PAT_NEWSLETTER;

    console.log('Newsletter Airtable Config:', {
      baseId: AIRTABLE_BASE_ID ? 'Set' : 'Missing',
      tableName: AIRTABLE_TABLE_NAME,
      personalAccessToken: AIRTABLE_PERSONAL_ACCESS_TOKEN ? 'Set' : 'Missing'
    });

    if (!AIRTABLE_BASE_ID || !AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      console.error('Missing Airtable configuration for newsletter');
      return apiError('Server configuration error', 500);
    }

    // Check if email already exists
    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Email}='${email}'`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
        },
      }
    );

    if (!checkResponse.ok) {
      console.error('Error checking existing email:', checkResponse.status);
    } else {
      const existingData = await checkResponse.json();
      if (existingData.records && existingData.records.length > 0) {
        return apiSuccess({ alreadySubscribed: true }, 'Email already subscribed');
      }
    }

    // Prepare data for Airtable
    const currentDate = new Date();
    const airtableData = {
      records: [
        {
          fields: {
            Email: email,
            'Subscription Date': currentDate.toISOString().split('T')[0],
            Source: 'Website Newsletter Signup',
            Status: 'Active'
          }
        }
      ]
    };

    console.log('Sending newsletter data to Airtable:', JSON.stringify(airtableData, null, 2));

    // Send to Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(airtableData),
      }
    );

    console.log('Newsletter Airtable response status:', airtableResponse.status);

    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.text();
      console.error('Newsletter Airtable API error:', {
        status: airtableResponse.status,
        statusText: airtableResponse.statusText,
        error: errorData,
        url: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`
      });
      return apiError('Failed to subscribe to newsletter', 500);
    }

    const result = await airtableResponse.json();
    console.log('Successfully saved newsletter subscription to Airtable:', result);

    // Ensure we have a valid result with records
    if (!result.records || result.records.length === 0) {
      console.error('Unexpected newsletter Airtable response structure:', result);
      return apiError('Unexpected response from newsletter service', 500);
    }

    console.log('Returning newsletter success response with status 200');
    return apiSuccess({ id: result.records[0].id }, 'Successfully subscribed to newsletter');

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return apiError('Internal server error', 500);
  }
}
