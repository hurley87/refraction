import { NextRequest, NextResponse } from "next/server";
import { getLocationLists, getLocationsForList } from "@/lib/db/location-lists";
import type { LocationListWithCount, Location } from "@/lib/types";

type LocationListWithLocations = LocationListWithCount & {
  locations?: Array<
    {
      membershipId: number;
    } & Location
  >;
};

const shapeLocations = (locations: Awaited<ReturnType<typeof getLocationsForList>>) =>
  locations.map((entry) => ({
    membershipId: entry.membership_id,
    ...entry.location,
  }));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeLocations = searchParams.get("includeLocations") === "true";

    const lists = await getLocationLists();
    const activeLists = lists.filter((list) => list.is_active);

    if (!includeLocations) {
      return NextResponse.json({
        lists: activeLists satisfies LocationListWithCount[],
      });
    }

    const listsWithLocations: LocationListWithLocations[] = await Promise.all(
      activeLists.map(async (list) => {
        const locations = await getLocationsForList(list.id);
        return {
          ...list,
          locations: shapeLocations(locations),
        };
      }),
    );

    return NextResponse.json({ lists: listsWithLocations });
  } catch (error) {
    console.error("Failed to fetch location lists", error);
    return NextResponse.json(
      { error: "Failed to fetch location lists" },
      { status: 500 },
    );
  }
}
