import { NextRequest } from "next/server";
import { getLocationLists, getLocationsForList } from "@/lib/db/location-lists";
import type { LocationListWithCount, Location } from "@/lib/types";
import { apiSuccess, apiError } from "@/lib/api/response";

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
      return apiSuccess({
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

    return apiSuccess({ lists: listsWithLocations });
  } catch (error) {
    console.error("Failed to fetch location lists", error);
    return apiError("Failed to fetch location lists", 500);
  }
}
