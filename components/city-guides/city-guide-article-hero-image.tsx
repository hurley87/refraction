import { cn } from '@/lib/utils';
import { CityGuideTexturedImage } from '@/components/city-guides/city-guide-textured-image';

/** Figma editorial hero frame (1350×1080, 5:4). */
export const EDITORIAL_HERO_ASPECT_CLASS = 'aspect-[1350/1080]';

export interface CityGuideArticleHeroImageProps {
  src: string;
  alt: string;
  /** Paper grit overlay; defaults off. */
  textureSrc?: string | null;
  /** Texture layer opacity (0–1). @default 0.48 */
  textureOpacity?: number;
  /**
   * Hero defaults to `lighten` so the photo stays vivid; `soft-light` reads more “matte” / muted.
   */
  textureBlendMode?: 'lighten' | 'soft-light';
  /** @default 'square' — city guide 361×361. Editorial uses 1350×1080 (5:4). */
  variant?: 'square' | 'editorial';
  className?: string;
}

/**
 * Article hero: square (361×361) or editorial (1350×1080 aspect); optional paper texture via `textureSrc`.
 */
export function CityGuideArticleHeroImage({
  src,
  alt,
  textureSrc = null,
  textureOpacity = 0.48,
  textureBlendMode = 'lighten',
  variant = 'square',
  className,
}: CityGuideArticleHeroImageProps) {
  const isEditorial = variant === 'editorial';

  return (
    <CityGuideTexturedImage
      src={src}
      alt={alt}
      sizes="361px"
      priority
      containerClassName={cn(
        'w-full max-w-[361px]',
        isEditorial ? EDITORIAL_HERO_ASPECT_CLASS : 'h-[361px]',
        className
      )}
      textureSrc={textureSrc}
      textureOpacity={textureOpacity}
      textureBlendMode={textureBlendMode}
      textureClassName="left-1/2 top-1/2 h-[412px] w-[412px] -translate-x-1/2 -translate-y-1/2"
      textureSizes="412px"
    />
  );
}
