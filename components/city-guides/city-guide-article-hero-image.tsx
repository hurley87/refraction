import { cn } from '@/lib/utils';
import {
  CityGuideTexturedImage,
  DEFAULT_PAPER_TEXTURE_SRC,
} from '@/components/city-guides/city-guide-textured-image';

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
  textureSrc = DEFAULT_PAPER_TEXTURE_SRC,
  textureOpacity = 0.38,
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
