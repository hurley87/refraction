import Image from 'next/image';

import { cn } from '@/lib/utils';

const DEFAULT_TEXTURE_SRC = '/city-guides/paper-texture.jpg';

export interface CityGuideArticleHeroImageProps {
  src: string;
  alt: string;
  /** Paper grit overlay; set `null` to disable. */
  textureSrc?: string | null;
  /** Texture layer opacity (0–1). @default 0.78 */
  textureOpacity?: number;
  /**
   * `lighten` matches design spec but bright paper can hide the photo — pair with lower `textureOpacity`.
   * `soft-light` keeps grit strong at higher opacity. @default soft-light
   */
  textureBlendMode?: 'lighten' | 'soft-light';
  className?: string;
}

/**
 * Article hero: 361×361 image with optional paper texture. (Earlier comps used 114px empty space
 * below the photo; that is omitted so body copy can sit ~20px under the image.)
 */
export function CityGuideArticleHeroImage({
  src,
  alt,
  textureSrc = DEFAULT_TEXTURE_SRC,
  textureOpacity = 0.38,
  textureBlendMode = 'lighten',
  className,
}: CityGuideArticleHeroImageProps) {
  return (
    <div
      className={cn(
        'relative h-[361px] w-full max-w-[361px] overflow-hidden',
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        className="object-cover object-center"
        sizes="361px"
      />
      {textureSrc ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[412px] w-[412px] -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <Image
            src={textureSrc}
            alt=""
            fill
            className={cn(
              'object-cover',
              textureBlendMode === 'lighten'
                ? 'mix-blend-lighten'
                : 'mix-blend-soft-light'
            )}
            style={{ opacity: textureOpacity }}
            sizes="412px"
          />
        </div>
      ) : null}
    </div>
  );
}
