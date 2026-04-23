import { cn } from '@/lib/utils';

import { EditorialArticleImageFrame } from '@/components/city-guides/editorial-article-image-frame';

/** Shapes a future CMS stream: paragraphs, two subtitle scales, and image frames. */
export type EditorialContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subtitleTitle3'; text: string }
  | { type: 'subtitleDisplay'; text: string }
  | { type: 'image'; src: string; alt: string; caption: string };

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
              <h2 key={key} className="title3 text-[#171717]">
                {block.text}
              </h2>
            );
          case 'subtitleDisplay':
            return (
              <h2 key={key} className="display1 text-[#171717]">
                {block.text}
              </h2>
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
