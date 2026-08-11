'use client';

import { useRouter } from 'next/navigation';
import MapCard from '@/components/map/map-card';
import { DragScrollRow } from '@/components/dashboard/drag-scroll-row';
import { usePlayerCustomListLocations } from '@/hooks/usePlayerCustomLists';
import type { LocationCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

type ProfilePersonalListsCarouselProps = {
  walletAddress: string | undefined;
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
 * Horizontal drawer-tile MapCards for the signed-in user's personal lists
 * (dashboard, under favorite venue / gallery / restaurant).
 */
export default function ProfilePersonalListsCarousel({
  walletAddress,
  className,
}: ProfilePersonalListsCarouselProps) {
  const router = useRouter();
  const { data: lists = [], isLoading } =
    usePlayerCustomListLocations(walletAddress);

  if (!walletAddress || isLoading || lists.length === 0) return null;

  return (
    <section
      className={cn('flex flex-col gap-2', className)}
      aria-label="Your lists"
    >
      <span className="label-small uppercase text-[#757575]">Your Lists</span>
      <DragScrollRow aria-label="Your lists carousel">
        {lists.map((list) => {
          const first = list.locations[0];
          const imageUrl =
            list.thumbnail_url ||
            first?.coin_image_thumb_url ||
            first?.coin_image_url ||
            null;
          const count = list.location_count ?? list.locations.length;

          return (
            <MapCard
              key={list.id}
              variant="drawerTile"
              name={list.title}
              address={count === 1 ? '1 spot' : `${count} spots`}
              category={spotCategory(count)}
              imageUrl={imageUrl}
              placeId={first?.place_id}
              isExisting
              onAction={() => {
                router.push(
                  `/interactive-map?listId=${encodeURIComponent(list.id)}`
                );
              }}
            />
          );
        })}
      </DragScrollRow>
    </section>
  );
}
