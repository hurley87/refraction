import { z } from 'zod';
import {
  editorialTypographyStyleSchemaValues,
  type EditorialTypographyStyle,
} from '@/lib/guides/editorial-typography';

/**
 * One block in an editorial body stream (matches `EditorialArticleBlocks` renderer).
 * `paragraph` text is GitHub Flavored Markdown; typography blocks are plain text.
 */
export const editorialTypographyStyleSchema = z.enum(
  editorialTypographyStyleSchemaValues
);

export const editorialContentBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    /** Markdown source (`remark-gfm`). */
    text: z.string(),
  }),
  z.object({
    type: z.literal('typography'),
    style: editorialTypographyStyleSchema,
    text: z.string(),
  }),
  z.object({
    type: z.literal('image'),
    src: z.string(),
    alt: z.string(),
    caption: z.string(),
  }),
]);

export const editorialBlocksSchema = z.array(editorialContentBlockSchema);

export type EditorialContentBlock = z.infer<typeof editorialContentBlockSchema>;

/** Legacy admin types; normalized before parse. */
function migrateLegacyBlockTypes(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw.map((item) => {
    if (!item || typeof item !== 'object' || !('type' in item)) {
      return item;
    }
    const block = item as { type: string; text?: string };
    if (block.type === 'subtitleTitle3') {
      return {
        type: 'typography',
        style: 'title3' satisfies EditorialTypographyStyle,
        text: block.text ?? '',
      };
    }
    if (block.type === 'subtitleH1' || block.type === 'subtitleDisplay') {
      return {
        type: 'typography',
        style: 'h1' satisfies EditorialTypographyStyle,
        text: block.text ?? '',
      };
    }
    return item;
  });
}

/**
 * Parse and normalize editorial blocks from JSON (DB or admin).
 * Invalid blocks are dropped; empty strings trimmed where useful.
 */
export function parseEditorialBlocks(raw: unknown): EditorialContentBlock[] {
  const parsed = editorialBlocksSchema.safeParse(migrateLegacyBlockTypes(raw));
  if (!parsed.success) {
    return [];
  }
  return parsed.data.map((block) => {
    if (block.type === 'paragraph' || block.type === 'typography') {
      return { ...block, text: block.text.trim() };
    }
    return {
      ...block,
      src: block.src.trim(),
      alt: block.alt.trim(),
      caption: block.caption.trim(),
    };
  });
}
