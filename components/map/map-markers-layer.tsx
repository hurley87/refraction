'use client';

import { Marker } from 'react-map-gl/mapbox';
import { MapPinImage } from '@/components/map/map-pin-image';
import type { MarkerData } from '@/components/map/interactive-map-types';

type MapMarkersLayerProps = {
  visibleMarkers: MarkerData[];
  selectedMarker: MarkerData | null;
  pendingMapCreateMarker: MarkerData | null;
  userLocation: { latitude: number; longitude: number } | null;
  onMarkerClick: (marker: MarkerData) => void;
};

export function MapMarkersLayer({
  visibleMarkers,
  selectedMarker,
  pendingMapCreateMarker,
  userLocation,
  onMarkerClick,
}: MapMarkersLayerProps) {
  return (
    <>
      {/* Permanent Markers (existing locations) */}
      {visibleMarkers.map((marker) => (
        <Marker
          key={marker.place_id}
          latitude={marker.latitude}
          longitude={marker.longitude}
          anchor="bottom"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkerClick(marker);
            }}
            className="cursor-pointer z-50"
            aria-label={`Marker at ${marker.name}`}
          >
            <div
              className={`relative transition-all ${
                selectedMarker?.place_id === marker.place_id ? 'scale-110' : ''
              }`}
              style={{ width: '51px', height: '65px' }}
            >
              {/* SVG Pin Background */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="51"
                height="65"
                viewBox="0 0 51 65"
                fill="none"
                className="absolute inset-0"
              >
                <g filter="url(#filter0_d_7557_31214)">
                  <path
                    d="M41.2 16.6438C41.2 25.836 25.9572 45 25.2 45C24.4429 45 9.20001 25.836 9.20001 16.6438C9.20001 7.4517 16.3635 0 25.2 0C34.0366 0 41.2 7.4517 41.2 16.6438Z"
                    fill="white"
                  />
                  <path
                    d="M25.2 0.5C33.7419 0.5 40.6999 7.70892 40.7 16.6436C40.7 18.8277 39.7872 21.6669 38.3533 24.7412C36.9263 27.8007 35.0112 31.0358 33.0662 33.9941C31.1221 36.9512 29.1546 39.6224 27.6277 41.5518C26.864 42.5168 26.2136 43.2921 25.7342 43.8232C25.5143 44.0669 25.3343 44.2527 25.2 44.3809C25.0657 44.2527 24.8858 44.0669 24.6658 43.8232C24.1864 43.2921 23.536 42.5168 22.7723 41.5518C21.2454 39.6224 19.2779 36.9512 17.3338 33.9941C15.3888 31.0358 13.4737 27.8007 12.0467 24.7412C10.6128 21.6669 9.70001 18.8277 9.70001 16.6436C9.70016 7.70892 16.6581 0.5 25.2 0.5Z"
                    stroke="white"
                  />
                </g>
                <defs>
                  <filter
                    id="filter0_d_7557_31214"
                    x="0"
                    y="0"
                    width="50.4"
                    height="64.2"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feOffset dy="10" />
                    <feGaussianBlur stdDeviation="4.6" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                      type="matrix"
                      values="0 0 0 0 1 0 0 0 0 0.949019608 0 0 0 0 0 0 0 0 1 0"
                    />
                    <feBlend
                      mode="normal"
                      in2="BackgroundImageFix"
                      result="effect1_dropShadow_7557_31214"
                    />
                    <feBlend
                      mode="normal"
                      in="SourceGraphic"
                      in2="effect1_dropShadow_7557_31214"
                      result="shape"
                    />
                  </filter>
                </defs>
              </svg>
              {/* Image inside pin — missing/broken URLs use IRL ink-black mark */}
              <MapPinImage
                imageUrl={marker.imageUrl}
                imageThumbUrl={marker.imageThumbUrl}
                alt={marker.name}
                className="absolute rounded-full object-cover"
                style={{
                  width: '28px',
                  height: '28px',
                  top: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          </button>
        </Marker>
      ))}

      {pendingMapCreateMarker && (
        <Marker
          latitude={pendingMapCreateMarker.latitude}
          longitude={pendingMapCreateMarker.longitude}
          anchor="bottom"
        >
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-white bg-[#FFF200] shadow-md" />
        </Marker>
      )}

      {userLocation && (
        <Marker
          latitude={userLocation.latitude}
          longitude={userLocation.longitude}
          anchor="center"
        >
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/70" />
            <span className="relative inline-flex h-3 w-3 rounded-full border border-white bg-sky-500 dark:border-black" />
          </div>
        </Marker>
      )}
    </>
  );
}
