import { NextRequest, NextResponse } from "next/server";

/**
 * Geocoding API route using Mapbox Geocoding API
 * @param request - Next.js request object
 * @returns JSON response with location data or error
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.MAPBOX_ACCESS_TOKEN;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Mapbox access token not configured" },
      { status: 500 }
    );
  }

  console.log(`[Mapbox Geocode API] Processing query: "${query}"`);

  try {
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${apiKey}&limit=5&types=place,locality,neighborhood,address,poi`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(mapboxUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Mapbox API HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Transform Mapbox response to match your interface
    const locations = data.features.map((feature: any) => ({
      place_id: feature.id,
      display_name: feature.place_name,
      lat: feature.center[1].toString(), // Mapbox uses [lng, lat] format
      lon: feature.center[0].toString(),
      type: feature.place_type?.[0] || "location",
      name: feature.text,
      context: feature.context?.map((c: any) => c.text).join(", "),
    }));

    console.log(`[Mapbox Geocode API] Found ${locations.length} locations`);
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Mapbox geocoding error:", error);
    return NextResponse.json(
      { error: "Failed to fetch location data" },
      { status: 500 }
    );
  }
}
