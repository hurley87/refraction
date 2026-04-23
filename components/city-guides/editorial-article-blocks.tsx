import { cn } from '@/lib/utils';

import { EditorialArticleImageFrame } from '@/components/city-guides/editorial-article-image-frame';
import type { EditorialContentBlock } from '@/lib/guides/block-schema';

export type { EditorialContentBlock };

export interface EditorialArticleBlocksProps {
  blocks: EditorialContentBlock[];
  className?: string;
}

export function EditorialArticleBlocks({
  blocks,
  className,
}: EditorialArticleBlocksProps) {
  return (
    <div className={cn('flex w-full max-w-[361px] flex-col gap-6', className)}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={key} className="body-medium text-[#171717]">
                {block.text}
              </p>
            );
          case 'subtitleTitle3':
            return (
              <div key={key} className="title3 text-[#171717]">
                {block.text}
              </div>
            );
          case 'subtitleH1':
            return (
              <h1 key={key} className="text-[#171717]">
                {block.text}
              </h1>
            );
          case 'image':
            return (
              <EditorialArticleImageFrame
                key={key}
                src={block.src}
                alt={block.alt}
                caption={block.caption}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
