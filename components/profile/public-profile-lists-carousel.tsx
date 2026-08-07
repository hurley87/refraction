'use client';

import { useRouter } from 'next/navigation';
import MapCard from '@/components/map/map-card';
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

  if (lists.length === 0) return null;

  return (
    <section className={cn(className)} aria-label="Lists">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lists.map((list) => (
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
            placeId={list.preview_place?.place_id}
            isExisting
            onAction={() => {
              const place = list.preview_place;
              if (place) {
                router.push(
                  `/interactive-map?placeId=${encodeURIComponent(place.place_id)}&lat=${place.latitude}&lng=${place.longitude}&mapCard=1`
                );
                return;
              }
              router.push('/interactive-map');
            }}
          />
        ))}
      </div>
    </section>
  );
}
