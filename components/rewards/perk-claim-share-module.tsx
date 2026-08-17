'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { buildPerkMemberShareUrl } from '@/lib/perks/member-share-url';

const COPIED_LABEL_MS = 2000;

type PerkClaimShareModuleProps = {
  perkTitle: string;
  perkId?: string;
};

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

/**
 * Share prompt on the in-person perk claim success screen.
 * Uses Web Share when available; otherwise copies the UTM-tagged link.
 */
export default function PerkClaimShareModule({
  perkTitle,
  perkId,
}: PerkClaimShareModuleProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const shareUrl = buildPerkMemberShareUrl({ title: perkTitle, perkId });

  const showCopied = () => {
    setCopied(true);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copiedTimeoutRef.current = null;
    }, COPIED_LABEL_MS);
  };

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: perkTitle, url: shareUrl });
        return;
      } catch (error) {
        if (isAbortError(error)) return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showCopied();
    } catch {
      // Clipboard can fail without a secure context; leave the button unchanged.
    }
  };

  return (
    <section
      className="flex flex-col gap-3"
      aria-label="Share this with a friend"
    >
      <div className="flex flex-col gap-1">
        <h2 className="title5 text-[#171717]">Share this with a friend</h2>
        <p className="body-medium text-[#171717]">
          Bring someone to the spot with you.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="label-large flex h-12 w-full items-center justify-between gap-2 bg-[#171717] px-4 font-grotesk uppercase tracking-wide text-white transition-opacity hover:opacity-95"
      >
        <span className="min-w-0 truncate whitespace-nowrap text-left">
          {copied ? 'Link copied' : 'Share this perk'}
        </span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
          aria-hidden
        >
          <Image
            src="/right-arrow.svg" style={{ transform: 'rotate(-45deg)' }}
       
            alt=""
            width={24}
            height={24}
            className="size-4 object-contain"
          />
        </span>
      </button>
    </section>
  );
}
