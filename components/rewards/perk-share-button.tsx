'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  sharePerkLink,
  type PerkShareMethod,
} from '@/lib/perks/share-perk-link';
import { cn } from '@/lib/utils';

type PerkShareButtonProps = {
  perkTitle: string;
  perkId?: string;
  className?: string;
  /** Called only when the link actually went out, for analytics. */
  onShared?: (method: PerkShareMethod) => void;
};

/**
 * Share control on a reward's details view. Opens the native share sheet where
 * it exists and copies the link everywhere else, so desktop still gets
 * feedback.
 */
export default function PerkShareButton({
  perkTitle,
  perkId,
  className,
  onShared,
}: PerkShareButtonProps) {
  const handleShare = async () => {
    const method = await sharePerkLink({ title: perkTitle, perkId });
    if (!method) return;
    if (method === 'clipboard') toast.success('Link copied');
    onShared?.(method);
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-[179px] border border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-90',
        className
      )}
      aria-label="Share this reward"
    >
      <Share2 className="size-5 shrink-0 text-[#757575]" aria-hidden />
    </button>
  );
}
