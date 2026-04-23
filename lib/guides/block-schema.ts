import { z } from 'zod';

/** One block in an editorial body stream (matches `EditorialArticleBlocks` renderer). */
export const editorialContentBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('subtitleTitle3'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('subtitleH1'),
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

/** Legacy admin type; normalized to `subtitleH1` before parse. */
function migrateLegacyBlockTypes(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw.map((item) => {
    if (
      item &&
      typeof item === 'object' &&
      'type' in item &&
      (item as { type: string }).type === 'subtitleDisplay'
    ) {
      return { ...item, type: 'subtitleH1' };
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
    if (block.type === 'paragraph') {
      return { ...block, text: block.text.trim() };
    }
    if (block.type === 'subtitleTitle3' || block.type === 'subtitleH1') {
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
