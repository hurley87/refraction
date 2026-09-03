import { cn } from '@/lib/utils';
import { CityGuideTexturedImage } from '@/components/city-guides/city-guide-textured-image';

/** Instagram portrait hero frame (1080×1350, 4:5). */
export const EDITORIAL_HERO_ASPECT_CLASS = 'aspect-[1080/1350]';

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
  /** Kept for callers; city guides and editorials both use 1080×1350. */
  variant?: 'square' | 'editorial';
  className?: string;
}

/**
 * Article hero at 1080×1350 (4:5 portrait); optional paper texture via `textureSrc`.
 */
export function CityGuideArticleHeroImage({
  src,
  alt,
  textureSrc = null,
  textureOpacity = 0.48,
  textureBlendMode = 'lighten',
  className,
}: CityGuideArticleHeroImageProps) {
  return (
    <CityGuideTexturedImage
      src={src}
      alt={alt}
      sizes="361px"
      priority
      containerClassName={cn(
        'w-full max-w-[361px]',
        EDITORIAL_HERO_ASPECT_CLASS,
        className
      )}
      textureSrc={textureSrc}
      textureOpacity={textureOpacity}
      textureBlendMode={textureBlendMode}
      textureClassName="absolute inset-0 h-full w-full translate-x-0 translate-y-0"
      textureSizes="412px"
    />
  );
}
