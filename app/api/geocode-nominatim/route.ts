import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "refraction-app",
      },
    });

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();
    
    const results = data.map((place: any) => ({
      place_id: place.place_id?.toString() || place.osm_id?.toString() || `${place.lat}-${place.lon}`,
      display_name: place.display_name,
      lat: place.lat,
      lon: place.lon,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}