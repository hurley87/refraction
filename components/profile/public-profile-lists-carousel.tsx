'use client';

import { useRouter } from 'next/navigation';
import MapCard from '@/components/map/map-card';
import { DragScrollRow } from '@/components/dashboard/drag-scroll-row';
import type { PublicPlayerListCard } from '@/lib/db/player-custom-lists';
import type { LocationCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

type PublicProfileListsCarouselProps = {
  lists: PublicPlayerListCard[];
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
  className,
}: PublicProfileListsCarouselProps) {
  const router = useRouter();

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
                if (place) {
                  router.push(
                    `/interactive-map?placeId=${encodeURIComponent(place.place_id)}&lat=${place.latitude}&lng=${place.longitude}&mapCard=1`
                  );
                  return;
                }
                router.push('/interactive-map');
              }}
            />
          );
        })}
      </DragScrollRow>
    </section>
  );
}
