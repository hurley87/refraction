import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Airtable configuration
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Contact Submissions';
    const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;

    // Debug logging
    console.log('Airtable Config:', {
      baseId: AIRTABLE_BASE_ID ? 'Set' : 'Missing',
      tableName: AIRTABLE_TABLE_NAME,
      personalAccessToken: AIRTABLE_PERSONAL_ACCESS_TOKEN ? 'Set' : 'Missing'
    });

    if (!AIRTABLE_BASE_ID || !AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      console.error('Missing Airtable configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
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
            'Submission Date': currentDate.toISOString().split('T')[0],
            Source: 'Website Contact Form'
          }
        }
      ]
    };

    // Send to Airtable
    console.log('Sending data to Airtable:', JSON.stringify(airtableData, null, 2));
    
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

    console.log('Airtable response status:', airtableResponse.status);
    console.log('Airtable response headers:', Object.fromEntries(airtableResponse.headers.entries()));

    if (!airtableResponse.ok) {
      const errorData = await airtableResponse.text();
      console.error('Airtable API error:', {
        status: airtableResponse.status,
        statusText: airtableResponse.statusText,
        error: errorData,
        url: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`
      });
      return NextResponse.json(
        { error: 'Failed to save submission', details: errorData },
        { status: 500 }
      );
    }

    const result = await airtableResponse.json();
    console.log('Successfully saved to Airtable:', result);

    // Ensure we have a valid result with records
    if (!result.records || result.records.length === 0) {
      console.error('Unexpected Airtable response structure:', result);
      return NextResponse.json(
        { error: 'Unexpected response from Airtable' },
        { status: 500 }
      );
    }

    console.log('Returning success response with status 200');
    const successResponse = { message: 'Contact form submitted successfully', id: result.records[0].id };
    console.log('Success response body:', JSON.stringify(successResponse, null, 2));
    
    return NextResponse.json(successResponse, { status: 200 });

  } catch (error) {
    console.error('Contact form submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
