'use client';

import { useRouter } from 'next/navigation';
import MapCard from '@/components/map/map-card';
import { DragScrollRow } from '@/components/dashboard/drag-scroll-row';
import type { PublicPlayerListCard } from '@/lib/db/player-custom-lists';
import type { LocationCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { normalizeUsername } from '@/lib/username';

type PublicProfileListsCarouselProps = {
  lists: PublicPlayerListCard[];
  /** Profile username for canonical /map/{username}/{list-slug} links. */
  profileUsername: string;
  /** Profile path used for map back navigation (`returnTo`). */
  returnPath: string;
  className?: string;
};

function spotCategory(count: number): LocationCategory {
  return {
    id: 'list',
    slug: 'list',
    name: count === 1 ? '1 spot' : `${count} spots`,
  };
}

/**
 * Horizontal drawer-tile MapCards for a player's public personal lists.
 */
export default function PublicProfileListsCarousel({
  lists,
  profileUsername,
  returnPath,
  className,
}: PublicProfileListsCarouselProps) {
  const router = useRouter();
  const username = normalizeUsername(profileUsername);

  if (lists.length === 0) {
    return null;
  }

  return (
    <section
      className={cn('flex flex-col gap-2', className)}
      aria-label="Lists"
    >
      <span className="label-small uppercase text-[#757575]">Their Lists</span>
      <DragScrollRow aria-label="Lists carousel">
        {lists.map((list) => {
          const place = list.preview_place;
          return (
            <MapCard
              key={list.id}
              variant="drawerTile"
              name={list.title}
              address={
                list.location_count === 1
                  ? '1 spot'
                  : `${list.location_count} spots`
              }
              category={spotCategory(list.location_count)}
              imageUrl={list.image_url}
              placeId={place?.place_id}
              isExisting
              onAction={() => {
                const query = new URLSearchParams({ returnTo: returnPath });
                if (place) {
                  query.set('lat', String(place.latitude));
                  query.set('lng', String(place.longitude));
                }
                if (username) {
                  router.push(
                    `/map/${encodeURIComponent(username)}/${encodeURIComponent(list.slug)}?${query.toString()}`
                  );
                  return;
                }
                query.set('profileListId', list.id);
                router.push(`/interactive-map?${query.toString()}`);
              }}
            />
          );
        })}
      </DragScrollRow>
    </section>
  );
}
