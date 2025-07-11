import { NextRequest, NextResponse } from "next/server";

// Famous landmarks fallback database (same as Mapbox)
const FAMOUS_LANDMARKS = [
  {
    name: "CN Tower",
    display_name: "CN Tower, Toronto, Ontario, Canada",
    lat: "43.6426",
    lon: "-79.3871",
    keywords: ["cn tower", "cn tower toronto", "toronto cn tower", "cntower"],
    landmark: true,
    category: "landmark",
    maki: "monument",
  },
  {
    name: "Statue of Liberty",
    display_name: "Statue of Liberty, New York, NY, USA",
    lat: "40.6892",
    lon: "-74.0445",
    keywords: ["statue of liberty", "liberty statue", "statue liberty"],
    landmark: true,
    category: "landmark",
    maki: "monument",
  },
  {
    name: "Eiffel Tower",
    display_name: "Eiffel Tower, Paris, France",
    lat: "48.8584",
    lon: "2.2945",
    keywords: ["eiffel tower", "tower eiffel", "eiffel", "tour eiffel"],
    landmark: true,
    category: "landmark",
    maki: "monument",
  },
  {
    name: "Times Square",
    display_name: "Times Square, New York, NY, USA",
    lat: "40.7580",
    lon: "-73.9855",
    keywords: ["times square", "time square", "timesquare"],
    landmark: true,
    category: "landmark",
    maki: "attraction",
  },
  {
    name: "Golden Gate Bridge",
    display_name: "Golden Gate Bridge, San Francisco, CA, USA",
    lat: "37.8199",
    lon: "-122.4783",
    keywords: ["golden gate bridge", "golden gate", "gg bridge"],
    landmark: true,
    category: "landmark",
    maki: "monument",
  },
  {
    name: "Sydney Opera House",
    display_name: "Sydney Opera House, Sydney, NSW, Australia",
    lat: "-33.8568",
    lon: "151.2153",
    keywords: ["sydney opera house", "opera house", "sydney opera"],
    landmark: true,
    category: "landmark",
    maki: "attraction",
  },
];

/**
 * Geocoding API route using Google Places API
 * @param request - Next.js request object
 * @returns JSON response with location data or error
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 },
    );
  }

  console.log(`[Google Places API] Processing query: "${query}"`);

  try {
    // First, check for famous landmarks in our fallback database
    const normalizedQuery = query.toLowerCase().trim();
    const landmarkMatches = FAMOUS_LANDMARKS.filter((landmark) =>
      landmark.keywords.some(
        (keyword) =>
          normalizedQuery.includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(normalizedQuery),
      ),
    ).map((landmark) => ({
      place_id: `landmark-${landmark.name.toLowerCase().replace(/\s+/g, "-")}`,
      display_name: landmark.display_name,
      lat: landmark.lat,
      lon: landmark.lon,
      type: "landmark",
      name: landmark.name,
      context: landmark.display_name.split(", ").slice(1).join(", "),
      category: landmark.category,
      landmark: landmark.landmark,
      maki: landmark.maki,
      relevance: 1.0,
    }));

    console.log(
      `[Google Places API] Found ${landmarkMatches.length} landmark matches`,
    );

    // Then try Google Places API for additional results
    const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query,
    )}&key=${apiKey}&type=establishment`;

    console.log(`[Google Places API] Trying text search: ${googleUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(googleUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Google Places API HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();
    console.log(
      `[Google Places API] Raw response results:`,
      data.results?.length || 0,
    );

    if (data.error_message) {
      console.error(`[Google Places API] Error:`, data.error_message);
      return NextResponse.json({ error: data.error_message }, { status: 400 });
    }

    const googleLocations = (data.results || []).map((place: any) => {
      // Categorize the place type
      const types = place.types || [];
      const isLandmark =
        types.includes("tourist_attraction") ||
        types.includes("museum") ||
        types.includes("amusement_park") ||
        types.includes("park") ||
        types.includes("monument");

      const isRestaurant =
        types.includes("restaurant") ||
        types.includes("food") ||
        types.includes("meal_takeaway") ||
        types.includes("cafe");

      const isBar =
        types.includes("bar") ||
        types.includes("night_club") ||
        types.includes("liquor_store");

      const isRetail =
        types.includes("store") ||
        types.includes("shopping_mall") ||
        types.includes("clothing_store");

      // Determine primary category
      let category = "establishment";
      let maki = "marker";

      if (isLandmark) {
        category = "landmark";
        maki = "monument";
      } else if (isRestaurant) {
        category = "restaurant";
        maki = "restaurant";
      } else if (isBar) {
        category = "bar";
        maki = "bar";
      } else if (isRetail) {
        category = "retail";
        maki = "shop";
      }

      return {
        place_id: place.place_id,
        display_name: `${place.name}, ${place.formatted_address}`,
        lat: place.geometry.location.lat.toString(),
        lon: place.geometry.location.lng.toString(),
        type: "poi",
        name: place.name,
        context: place.formatted_address,
        category: category,
        landmark: isLandmark,
        maki: maki,
        relevance: place.rating ? place.rating / 5.0 : 0.5,
        rating: place.rating || null,
        price_level: place.price_level || null,
        user_ratings_total: place.user_ratings_total || 0,
        types: types,
      };
    });

    // Combine landmark matches with Google results
    const allLocations = [...landmarkMatches, ...googleLocations];

    // Remove duplicates (in case Google also returns our landmarks)
    const uniqueLocations = allLocations.filter(
      (location, index, self) =>
        index ===
        self.findIndex(
          (l) =>
            Math.abs(parseFloat(l.lat) - parseFloat(location.lat)) < 0.01 &&
            Math.abs(parseFloat(l.lon) - parseFloat(location.lon)) < 0.01,
        ),
    );

    // Sort results to prioritize landmarks and popular places
    const sortedLocations = uniqueLocations.sort((a, b) => {
      // First priority: our curated landmarks
      if (
        a.place_id.startsWith("landmark-") &&
        !b.place_id.startsWith("landmark-")
      )
        return -1;
      if (
        !a.place_id.startsWith("landmark-") &&
        b.place_id.startsWith("landmark-")
      )
        return 1;

      // Second priority: landmarks in general
      if (a.landmark && !b.landmark) return -1;
      if (!a.landmark && b.landmark) return 1;

      // Third priority: highly rated places
      const aRating = a.rating || 0;
      const bRating = b.rating || 0;
      const aPopularity = aRating * Math.log(a.user_ratings_total + 1) || 0;
      const bPopularity = bRating * Math.log(b.user_ratings_total + 1) || 0;

      if (aPopularity !== bPopularity) {
        return bPopularity - aPopularity;
      }

      // Fourth priority: relevance score
      return b.relevance - a.relevance;
    });

    console.log(
      `[Google Places API] Final results: ${sortedLocations.length} locations (${landmarkMatches.length} landmarks, ${googleLocations.length} google)`,
    );
    console.log(
      `[Google Places API] Top result:`,
      sortedLocations[0]?.name || "none",
    );

    return NextResponse.json(sortedLocations);
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch location data" },
      { status: 500 },
    );
  }
}
