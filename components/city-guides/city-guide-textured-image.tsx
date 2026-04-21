import Image from 'next/image';

import { cn } from '@/lib/utils';

export const DEFAULT_PAPER_TEXTURE_SRC = '/city-guides/paper-texture.jpg';

export interface CityGuideTexturedImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  containerClassName?: string;
  className?: string;
  /** Paper grit overlay; set `null` to disable. */
  textureSrc?: string | null;
  /** Texture layer opacity (0–1). @default 0.52 */
  textureOpacity?: number;
  /**
   * `lighten` matches some comps but can hide grit on bright areas.
   * `soft-light` keeps the paper grain more visible. @default soft-light
   */
  textureBlendMode?: 'lighten' | 'soft-light';
  textureClassName?: string;
  textureSizes?: string;
}

/**
 * Base image with optional paper texture overlay for city guide visuals.
 */
export function CityGuideTexturedImage({
  src,
  alt,
  sizes,
  priority = false,
  containerClassName,
  className,
  textureSrc = DEFAULT_PAPER_TEXTURE_SRC,
  textureOpacity = 0.52,
  textureBlendMode = 'soft-light',
  textureClassName,
  textureSizes,
}: CityGuideTexturedImageProps) {
  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={cn('object-cover object-center', className)}
        sizes={sizes}
      />
      {textureSrc ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-[1]',
            textureClassName
          )}
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
            sizes={textureSizes ?? sizes}
          />
        </div>
      ) : null}
    </div>
  );
}
