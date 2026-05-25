'use client';

import { useState } from 'react';
import { getLocationPinImageUrl } from '@/lib/utils/location-image-url';

interface MapPinImageProps {
  imageUrl: string;
  imageThumbUrl?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Map pin locator image — prefers thumb URL, falls back to full image on load error. */
export function MapPinImage({
  imageUrl,
  imageThumbUrl,
  alt,
  className,
  style,
}: MapPinImageProps) {
  const [src, setSrc] = useState(
    () => getLocationPinImageUrl(imageUrl, imageThumbUrl) ?? imageUrl
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onError={() => {
        if (src !== imageUrl) {
          setSrc(imageUrl);
        }
      }}
    />
  );
}
