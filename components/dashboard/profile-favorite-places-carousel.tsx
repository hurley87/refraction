'use client';

import { useRouter } from 'next/navigation';
import MapCard from '@/components/map/map-card';
import { DragScrollRow } from '@/components/dashboard/drag-scroll-row';
import type { ProfileFavoritePlace, UserProfile } from '@/lib/types';

type FavoriteCarouselItem = {
  key: string;
  label: string;
  place: ProfileFavoritePlace;
};

function collectFavoritePlaces(
  profile: UserProfile | null | undefined
): FavoriteCarouselItem[] {
  if (!profile) return [];
  const items: FavoriteCarouselItem[] = [];
  if (profile.favorite_music_venue?.place_id) {
    items.push({
      key: 'favorite_music_venue',
      label: 'Favorite Venue',
      place: profile.favorite_music_venue,
    });
  }
  if (profile.favorite_gallery?.place_id) {
    items.push({
      key: 'favorite_gallery',
      label: 'Favorite Gallery',
      place: profile.favorite_gallery,
    });
  }
  if (profile.favorite_restaurant?.place_id) {
    items.push({
      key: 'favorite_restaurant',
      label: 'Favorite Restaurant',
      place: profile.favorite_restaurant,
    });
  }
  return items;
}

type ProfileFavoritePlacesCarouselProps = {
  profile: UserProfile | null | undefined;
  className?: string;
};

/**
 * Horizontal drawer-tile MapCards for profile favorite venue / gallery / restaurant.
 */
export default function ProfileFavoritePlacesCarousel({
  profile,
  className,
}: ProfileFavoritePlacesCarouselProps) {
  const router = useRouter();
  const items = collectFavoritePlaces(profile);

  if (items.length === 0) return null;

  return (
    <section className={className} aria-label="Favorite places">
      <DragScrollRow aria-label="Favorite places carousel">
        {items.map(({ key, label, place }) => (
          <div key={key} className="flex w-[206px] shrink-0 flex-col gap-2">
            <span className="label-small uppercase text-[#757575]">
              {label}
            </span>
            <MapCard
              variant="drawerTile"
              name={place.name}
              address={place.address || place.name}
              category={place.category}
              imageUrl={place.image_url}
              placeId={place.place_id}
              isExisting
              onAction={() => {
                const q = new URLSearchParams({
                  placeId: place.place_id,
                  lat: String(place.latitude),
                  lng: String(place.longitude),
                  mapCard: '1',
                });
                if (place.name?.trim()) q.set('name', place.name.trim());
                router.push(`/interactive-map?${q.toString()}`);
              }}
            />
          </div>
        ))}
      </DragScrollRow>
    </section>
  );
}
