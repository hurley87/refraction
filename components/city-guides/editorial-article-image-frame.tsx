import Image from 'next/image';

import { cn } from '@/lib/utils';

export interface EditorialArticleImageFrameProps {
  src: string;
  alt: string;
  caption: string;
  className?: string;
}

/**
 * Full-bleed editorial figure (393px rail): 8px padding, 4:5 frame, {@link label-small} caption.
 */
export function EditorialArticleImageFrame({
  src,
  alt,
  caption,
  className,
}: EditorialArticleImageFrameProps) {
  return (
    <figure
      className={cn(
        '-mx-4 box-border flex w-[calc(100%+2rem)] max-w-[393px] flex-col items-start gap-2 self-stretch p-2',
        className
      )}
    >
      <div className="relative h-[471.25px] w-full shrink-0 overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="377px"
        />
      </div>
      {caption.trim() ? (
        <figcaption className="label-small text-[#757575]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
