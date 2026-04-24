import Link from 'next/link';

type DraftPreviewBannerProps = {
  /** CMS editor route — set whenever this banner is shown for a draft preview. */
  guideId: string;
};

/**
 * Shown on signed `?preview=` draft views (guides / editorials).
 */
export function DraftPreviewBanner({ guideId }: DraftPreviewBannerProps) {
  return (
    <div
      className="border-b border-amber-200/80 bg-amber-100 px-4 py-2.5 font-grotesk text-sm text-amber-950"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
        <p className="text-center">
          <span className="font-semibold">Draft preview</span>
          <span className="text-amber-900/90">
            {' '}
            — this page is not visible to the public until you publish.
          </span>
        </p>
        <Link
          href={`/admin/guides/${guideId}`}
          className="shrink-0 font-semibold text-amber-950 underline decoration-amber-800/50 underline-offset-2 hover:decoration-amber-950"
        >
          Back to editor
        </Link>
      </div>
    </div>
  );
}
