'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { shareCuratedListLink } from '@/lib/location-lists/share-curated-list';
import { cn } from '@/lib/utils';

type CuratedListShareButtonProps = {
  slug: string;
  listTitle: string;
  className?: string;
};

/**
 * Share control on a curated map list. Opens the native share sheet with
 * `/map/lists/{slug}` where it exists, and copies the link everywhere else.
 */
export function CuratedListShareButton({
  slug,
  listTitle,
  className,
}: CuratedListShareButtonProps) {
  const handleShare = async () => {
    const method = await shareCuratedListLink({ slug, listTitle });
    if (!method) return;
    if (method === 'clipboard') toast.success('List link copied');
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={cn(
        'ml-auto flex size-10 shrink-0 items-center justify-center rounded-[179px] border border-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] bg-white p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-80',
        className
      )}
      aria-label={`Share ${listTitle}`}
      title={`Share ${listTitle}`}
    >
      <Share2 className="size-5 shrink-0 text-[#757575]" aria-hidden />
    </button>
  );
}
