'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, MessageCircle, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  buildPublicListShareCardPath,
  buildPublicListShareMessage,
  buildPublicListShareUrl,
} from '@/lib/player-lists/public-list-share-url';
import { cn } from '@/lib/utils';
import { getBrowserOrigin } from '@/lib/utils/client-origin';

// Generous enough to clear a cold dev compile of the card route, while still
// bounding a request that stalls without firing `error`.
const PREVIEW_TIMEOUT_MS = 30000;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

/**
 * Shares the link alone: messaging apps then unfurl this list's card image into
 * a preview that opens the list when tapped. Attaching the PNG instead would
 * arrive as a plain photo, which cannot carry a destination.
 */
function buildLinkSharePayload(input: {
  listTitle: string;
  shareUrl: string;
}): ShareData {
  return {
    title: input.listTitle,
    url: input.shareUrl,
  };
}

type ListShareButtonProps = {
  username: string;
  listSlug: string;
  listTitle: string;
  variant?: 'icon' | 'full';
  /** Opens an external presentation, such as the inline mobile drawer panel. */
  onRequestShare?: () => void;
};

type ListShareDetails = Pick<
  ListShareButtonProps,
  'username' | 'listSlug' | 'listTitle'
>;

function ShareCardPreview({
  shareCardPath,
  listTitle,
}: {
  shareCardPath: string;
  listTitle: string;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );

  // A request that stalls without firing `error` would otherwise spin forever.
  useEffect(() => {
    if (status !== 'loading') return;
    const timeoutId = window.setTimeout(
      () => setStatus('error'),
      PREVIEW_TIMEOUT_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, [status]);

  return (
    <div className="relative flex aspect-[1200/630] w-full items-center justify-center overflow-hidden rounded-2xl bg-[#F5F5F5]">
      {status === 'error' ? (
        <span className="body-small px-6 text-center text-[#757575]">
          Preview unavailable right now. The link still works.
        </span>
      ) : (
        <>
          {status === 'loading' ? (
            <Loader2
              className="size-6 animate-spin text-[#757575]"
              aria-hidden
            />
          ) : null}
          <Image
            src={shareCardPath}
            alt={`Share card for ${listTitle}`}
            width={1200}
            height={630}
            unoptimized
            loading="eager"
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
              status === 'ready' ? 'opacity-100' : 'opacity-0'
            )}
          />
        </>
      )}
    </div>
  );
}

/**
 * Opens the list share card (the same image that unfurls on social) with
 * actions to send the `/map/{username}/{slug}` link.
 */
export function ListShareButton({
  username,
  listSlug,
  listTitle,
  variant = 'icon',
  onRequestShare,
}: ListShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);

  // Web Share is unavailable on most desktop browsers; checked after mount so
  // the button label matches the action that will actually run.
  useEffect(() => {
    setCanWebShare(typeof navigator.share === 'function');
  }, []);

  const shareCardPath = buildPublicListShareCardPath({ username, listSlug });
  const shareUrl = buildPublicListShareUrl({
    username,
    listSlug,
    origin: getBrowserOrigin(),
  });
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('List link copied');
    } catch {
      toast.error('Could not copy list link');
    }
  };

  const handleWebShare = async () => {
    try {
      await navigator.share(buildLinkSharePayload({ listTitle, shareUrl }));
      setIsOpen(false);
    } catch (error) {
      if (isAbortError(error)) return;
      await handleCopyLink();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (onRequestShare) {
            onRequestShare();
            return;
          }
          setIsOpen(true);
        }}
        className={cn(
          'flex shrink-0 items-center justify-center border border-[var(--Borders-Heavy-Border,#454545)] bg-[var(--Backgrounds-Background,#FFF)] text-[#171717] transition-colors hover:bg-neutral-50',
          variant === 'full'
            ? 'label-medium h-11 w-full gap-2 px-4 uppercase tracking-wide'
            : 'ml-auto size-10 rounded-[179px] border-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] hover:opacity-80'
        )}
        aria-label={`Share ${listTitle}`}
        title={`Share ${listTitle}`}
      >
        {variant === 'full' ? 'Share list' : null}
        <Share2
          className={cn(
            'shrink-0',
            variant === 'full'
              ? 'size-4 text-[#171717]'
              : 'size-5 text-[#757575]'
          )}
          aria-hidden
        />
      </button>

      {!onRequestShare ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-[420px] gap-4 rounded-none p-6">
            <DialogTitle className="title4 uppercase text-[#171717]">
              Share list
            </DialogTitle>
            <DialogDescription className="body-small text-[#454545]">
              This card is what friends see when you send the link.
            </DialogDescription>

            <ShareCardPreview
              shareCardPath={shareCardPath}
              listTitle={listTitle}
            />

            <p className="body-small break-all text-[#757575]">{shareUrl}</p>

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="label-medium flex h-10 flex-1 items-center justify-center border border-[var(--Borders-Heavy-Border,#454545)] bg-[var(--Backgrounds-Background,#FFF)] uppercase tracking-wide text-[#171717] transition-colors hover:bg-neutral-50"
              >
                Copy link
              </button>
              {canWebShare ? (
                <button
                  type="button"
                  onClick={handleWebShare}
                  className="label-medium flex h-10 flex-1 items-center justify-center bg-[#171717] uppercase tracking-wide text-white transition-colors hover:bg-black"
                >
                  Share
                </button>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/**
 * Mobile drawer presentation of the generated card and its sharing actions.
 */
export function ListSharePanel({
  username,
  listSlug,
  listTitle,
  onClose,
}: ListShareDetails & { onClose: () => void }) {
  const shareCardPath = buildPublicListShareCardPath({ username, listSlug });
  const shareUrl = buildPublicListShareUrl({
    username,
    listSlug,
    origin: getBrowserOrigin(),
  });
  const message = buildPublicListShareMessage({ listTitle, shareUrl });
  const messageHref = `sms:?&body=${encodeURIComponent(message)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('List link copied');
    } catch {
      toast.error('Could not copy list link');
    }
  };

  const handleShareTo = async () => {
    if (typeof navigator.share !== 'function') {
      toast.error('Share options are not available in this browser');
      return;
    }

    try {
      await navigator.share(buildLinkSharePayload({ listTitle, shareUrl }));
    } catch (error) {
      if (!isAbortError(error)) {
        toast.error('Could not open share options');
      }
    }
  };

  return (
    <section
      className="flex w-full flex-col gap-4 py-2"
      aria-label="Share list"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_40px] items-start gap-2">
        <ShareCardPreview shareCardPath={shareCardPath} listTitle={listTitle} />
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full border border-[#DBDBDB] bg-white text-[#454545] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)]"
          aria-label="Close share card"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleShareTo}
          className="label-small flex h-12 min-w-0 items-center justify-center gap-1.5 bg-[#171717] px-2 uppercase text-white"
        >
          <Share2 className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Share to…</span>
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="label-small flex h-12 min-w-0 items-center justify-center bg-[#DBDBDB] px-2 uppercase text-[#171717]"
        >
          Copy link
        </button>
        <a
          href={messageHref}
          className="label-small flex h-12 min-w-0 items-center justify-center gap-1.5 border border-[#454545] bg-white px-2 uppercase text-[#171717]"
        >
          <MessageCircle className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Messages</span>
        </a>
      </div>
    </section>
  );
}
