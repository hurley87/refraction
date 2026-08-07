'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LocationSearch from '@/components/shared/location-search';
import type { LocationCategory, ProfileFavoritePlace } from '@/lib/types';

type LocationSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSelect: (place: ProfileFavoritePlace) => void;
};

type IrlLocationLookup = {
  name?: string | null;
  address?: string | null;
  coin_image_url?: string | null;
  coin_image_thumb_url?: string | null;
  category?: LocationCategory | null;
};

type IrlLocationLookupRow = IrlLocationLookup & {
  place_id?: string;
  latitude?: number;
  longitude?: number;
};

async function enrichFromIrlLocation(input: {
  placeId: string;
  latitude: number;
  longitude: number;
  name: string;
}): Promise<IrlLocationLookupRow | null> {
  try {
    const params = new URLSearchParams({
      placeId: input.placeId,
      lat: String(input.latitude),
      lng: String(input.longitude),
      name: input.name,
    });
    const res = await fetch(`/api/locations?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data?.location ??
      json.location ??
      null) as IrlLocationLookupRow | null;
  } catch {
    return null;
  }
}

/**
 * Modal wrapper around map `LocationSearch` for picking a profile favorite place.
 */
export function LocationSearchDialog({
  open,
  onOpenChange,
  title,
  onSelect,
}: LocationSearchDialogProps) {
  const [isResolving, setIsResolving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%,393px)] max-w-[393px] gap-0 overflow-visible border border-gray-200 bg-white p-0 font-grotesk sm:rounded-3xl"
        overlayClassName="bg-black/60 backdrop-blur-sm"
      >
        <DialogHeader className="border-b border-[#EDEDED] px-4 py-4 text-left">
          <DialogTitle className="title5 text-[#171717]">{title}</DialogTitle>
          <DialogDescription className="body-small text-[#757575]">
            Search for a place, then select it from the list.
          </DialogDescription>
        </DialogHeader>
        <div className="relative px-4 py-4 pb-8">
          <LocationSearch
            key={open ? 'open' : 'closed'}
            placeholder="Search for a location"
            defaultExpanded
            keepExpanded
            dropdownTheme="light"
            shellClassName="rounded-none border border-[#DBDBDB] bg-white shadow-none focus-within:rounded-none"
            onSelect={(picked) => {
              const name = picked.name?.trim();
              if (!name || isResolving) return;

              void (async () => {
                setIsResolving(true);
                try {
                  const irl = await enrichFromIrlLocation({
                    placeId: picked.id,
                    latitude: picked.latitude,
                    longitude: picked.longitude,
                    name,
                  });
                  const imageUrl =
                    irl?.coin_image_thumb_url?.trim() ||
                    irl?.coin_image_url?.trim() ||
                    null;
                  onSelect({
                    // Prefer IRL place_id so later exact lookups / map deep-links work
                    place_id: irl?.place_id?.trim() || picked.id,
                    name: irl?.name?.trim() || name,
                    address:
                      irl?.address?.trim() ||
                      picked.placeFormatted?.trim() ||
                      name,
                    latitude: irl?.latitude ?? picked.latitude,
                    longitude: irl?.longitude ?? picked.longitude,
                    image_url: imageUrl,
                    category: irl?.category ?? null,
                  });
                  onOpenChange(false);
                } finally {
                  setIsResolving(false);
                }
              })();
            }}
          />
          {isResolving ? (
            <p className="body-small mt-3 text-[#757575]">Loading place…</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
