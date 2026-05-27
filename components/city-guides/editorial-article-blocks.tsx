import { EditorialArticleImageFrame } from '@/components/city-guides/editorial-article-image-frame';
import { GuideArticleMarkdown } from '@/components/city-guides/guide-article-markdown';
import {
  editorialTypographyClassName,
  editorialTypographyElement,
} from '@/lib/guides/editorial-typography';
import type { EditorialContentBlock } from '@/lib/guides/block-schema';
import { cn } from '@/lib/utils';

export type { EditorialContentBlock };

export interface EditorialArticleBlocksProps {
  blocks: EditorialContentBlock[];
  className?: string;
  hyperlinkClassName?: string;
}

function EditorialArticleTypographyBlock({
  block,
}: {
  block: Extract<EditorialContentBlock, { type: 'typography' }>;
}) {
  const Tag = editorialTypographyElement(block.style);
  return (
    <Tag
      className={cn(
        'text-[#171717]',
        editorialTypographyClassName(block.style)
      )}
    >
      {block.text}
    </Tag>
  );
}

export function EditorialArticleBlocks({
  blocks,
  className,
  hyperlinkClassName,
}: EditorialArticleBlocksProps) {
  return (
    <div className={cn('flex w-full max-w-[361px] flex-col gap-6', className)}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case 'paragraph':
            return (
              <GuideArticleMarkdown
                key={key}
                markdown={block.text}
                hyperlinkClassName={hyperlinkClassName}
              />
            );
          case 'typography':
            return <EditorialArticleTypographyBlock key={key} block={block} />;
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
