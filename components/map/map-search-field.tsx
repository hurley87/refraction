'use client';

import LocationSearch from '@/components/shared/location-search';
import { MapYellowTip } from '@/components/map/map-yellow-tip';

/** Style/Body/Body Medium — map LocationSearch (Gal Gothic) */
const MAP_SEARCH_INPUT_CLASS =
  'text-center text-base font-medium leading-[22px] tracking-[-0.48px] font-["Gal_Gothic_Variable",sans-serif] text-[color:var(--Dark-Tint-40---Neutral,#A9A9A9)] placeholder:text-[color:var(--Dark-Tint-40---Neutral,#A9A9A9)]';

type SearchSelectPayload = {
  longitude: number;
  latitude: number;
  id: string;
  name?: string;
  placeFormatted?: string;
  featureType?: string;
};

type MapSearchFieldProps = {
  proximity: { longitude: number; latitude: number };
  onSelect: (picked: SearchSelectPayload) => void;
  showTourTip: boolean;
  onDismissTip: () => void;
  /** Wrapper around the search field (and tip). */
  className?: string;
  /** Passed through to LocationSearch. */
  searchClassName?: string;
  /** Tip positioning classes. */
  tipClassName?: string;
};

export function MapSearchField({
  proximity,
  onSelect,
  showTourTip,
  onDismissTip,
  className,
  searchClassName,
  tipClassName = 'absolute inset-x-0 top-full z-40 mt-2.5',
}: MapSearchFieldProps) {
  return (
    <div className={className}>
      <LocationSearch
        placeholder="Search"
        proximity={proximity}
        onSelect={onSelect}
        className={searchClassName}
        inputClassName={MAP_SEARCH_INPUT_CLASS}
      />
      {showTourTip ? (
        <MapYellowTip
          className={tipClassName}
          pointer="top"
          onDismiss={onDismissTip}
        >
          Search a spot you love
        </MapYellowTip>
      ) : null}
    </div>
  );
}
