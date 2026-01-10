import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";

// Mapbox geocoding API feature type
interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  place_type?: string[];
  text: string;
  context?: Array<{ text: string }>;
  properties?: {
    category?: string;
    maki?: string;
    landmark?: boolean;
  };
  relevance?: number;
}

// Famous landmarks fallback database
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
 * Geocoding API route using Mapbox Geocoding API
 * @param request - Next.js request object
 * @returns JSON response with location data or error
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return apiError("Query parameter is required", 400);
  }

  const apiKey = process.env.MAPBOX_ACCESS_TOKEN;
  if (!apiKey) {
    return apiError("Mapbox access token not configured", 500);
  }

  console.log(`[Mapbox Geocode API] Processing query: "${query}"`);

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
      type: "poi",
      name: landmark.name,
      context: landmark.display_name.split(", ").slice(1).join(", "),
      category: landmark.category,
      landmark: landmark.landmark,
      maki: landmark.maki,
      relevance: 1.0, // High relevance for exact matches
    }));

    console.log(
      `[Mapbox Geocode API] Found ${landmarkMatches.length} landmark matches`,
    );

    // Then try Mapbox API for additional results
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query,
    )}.json?access_token=${apiKey}&limit=8&types=poi&proximity=ip&autocomplete=false`;

    console.log(`[Mapbox Geocode API] Trying POI search: ${mapboxUrl}`);

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
    console.log(
      `[Mapbox Geocode API] Raw response features:`,
      data.features?.length || 0,
    );

    let mapboxLocations = data.features.map((feature: MapboxFeature) => {
      // Enhanced landmark detection
      const isLandmark =
        feature.properties?.category?.includes("landmark") ||
        feature.properties?.category?.includes("monument") ||
        feature.place_type?.includes("poi") ||
        feature.properties?.maki === "monument" ||
        feature.properties?.maki === "attraction" ||
        feature.properties?.landmark === true;

      return {
        place_id: feature.id,
        display_name: feature.place_name,
        lat: feature.center[1].toString(), // Mapbox uses [lng, lat] format
        lon: feature.center[0].toString(),
        type: feature.place_type?.[0] || "location",
        name: feature.text,
        context: feature.context?.map((c) => c.text).join(", "),
        category: feature.properties?.category || "",
        landmark: isLandmark,
        maki: feature.properties?.maki || "",
        relevance: feature.relevance || 0,
      };
    });

    // If no POI results from Mapbox, try a broader search
    if (mapboxLocations.length === 0) {
      console.log(`[Mapbox Geocode API] No POI results, trying broader search`);

      const broadUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query,
      )}.json?access_token=${apiKey}&limit=5&types=poi,place,locality,neighborhood,address&proximity=ip`;

      const broadResponse = await fetch(broadUrl, {
        signal: controller.signal,
      });

      if (broadResponse.ok) {
        const broadData = await broadResponse.json();
        console.log(
          `[Mapbox Geocode API] Broad search found:`,
          broadData.features?.length || 0,
        );

        mapboxLocations = broadData.features.map((feature: MapboxFeature) => {
          const isLandmark =
            feature.properties?.category?.includes("landmark") ||
            feature.properties?.category?.includes("monument") ||
            feature.place_type?.includes("poi") ||
            feature.properties?.maki === "monument" ||
            feature.properties?.maki === "attraction" ||
            feature.properties?.landmark === true;

          return {
            place_id: feature.id,
            display_name: feature.place_name,
            lat: feature.center[1].toString(),
            lon: feature.center[0].toString(),
            type: feature.place_type?.[0] || "location",
            name: feature.text,
            context: feature.context?.map((c) => c.text).join(", "),
            category: feature.properties?.category || "",
            landmark: isLandmark,
            maki: feature.properties?.maki || "",
            relevance: feature.relevance || 0,
          };
        });
      }
    }

    // Combine landmark matches with Mapbox results
    const allLocations = [...landmarkMatches, ...mapboxLocations];

    // Remove duplicates (in case Mapbox also returns our landmarks)
    const uniqueLocations = allLocations.filter(
      (location, index, self) =>
        index ===
        self.findIndex(
          (l) =>
            Math.abs(parseFloat(l.lat) - parseFloat(location.lat)) < 0.01 &&
            Math.abs(parseFloat(l.lon) - parseFloat(location.lon)) < 0.01,
        ),
    );

    // Sort results to prioritize landmarks and POIs
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

      // Third priority: POIs
      if (a.type === "poi" && b.type !== "poi") return -1;
      if (a.type !== "poi" && b.type === "poi") return 1;

      // Fourth priority: relevance score
      return b.relevance - a.relevance;
    });

    console.log(
      `[Mapbox Geocode API] Final results: ${sortedLocations.length} locations (${landmarkMatches.length} landmarks, ${mapboxLocations.length} mapbox)`,
    );
    console.log(
      `[Mapbox Geocode API] Top result:`,
      sortedLocations[0]?.name || "none",
    );

    return apiSuccess(sortedLocations);
  } catch (error) {
    console.error("Mapbox geocoding error:", error);
    return apiError("Failed to fetch location data", 500);
  }
}
