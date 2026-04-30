import { cn } from '@/lib/utils';
import { CityGuideTexturedImage } from '@/components/city-guides/city-guide-textured-image';

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
  className?: string;
}

/**
 * Article hero: 361×361 image; optional paper texture via `textureSrc`.
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
      containerClassName={cn('h-[361px] w-full max-w-[361px]', className)}
      textureSrc={textureSrc}
      textureOpacity={textureOpacity}
      textureBlendMode={textureBlendMode}
      textureClassName="left-1/2 top-1/2 h-[412px] w-[412px] -translate-x-1/2 -translate-y-1/2"
      textureSizes="412px"
    />
  );
}
