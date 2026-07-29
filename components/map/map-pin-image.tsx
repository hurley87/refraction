'use client';

import { useEffect, useState } from 'react';
import { getLocationPinImageUrl } from '@/lib/utils/location-image-url';

const DEFAULT_PIN_LOGO_SRC = '/irl-svg/irl-logo-new-white.svg';

interface MapPinImageProps {
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

function DefaultPinMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#171717',
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DEFAULT_PIN_LOGO_SRC}
        alt=""
        className="h-3.5 w-auto max-w-[18px] object-contain"
      />
    </div>
  );
}

/**
 * Map pin locator image — prefers thumb URL, falls back to full image on load
 * error, then to the IRL ink-black default mark if both fail or URL is missing.
 */
export function MapPinImage({
  imageUrl,
  imageThumbUrl,
  alt,
  className,
  style,
}: MapPinImageProps) {
  const preferred =
    imageUrl != null && imageUrl.trim().length > 0
      ? (getLocationPinImageUrl(imageUrl, imageThumbUrl) ?? imageUrl)
      : null;

  const [src, setSrc] = useState<string | null>(preferred);
  const [failed, setFailed] = useState(!preferred);

  useEffect(() => {
    const next =
      imageUrl != null && imageUrl.trim().length > 0
        ? (getLocationPinImageUrl(imageUrl, imageThumbUrl) ?? imageUrl)
        : null;
    setSrc(next);
    setFailed(!next);
  }, [imageUrl, imageThumbUrl]);

  if (failed || !src) {
    return <DefaultPinMark className={className} style={style} />;
  }

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
        if (imageUrl && src !== imageUrl) {
          setSrc(imageUrl);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
