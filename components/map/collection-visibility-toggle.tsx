'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CollectionVisibilityToggleProps {
  isPrivate: boolean;
  disabled?: boolean;
  onIsPrivateChange: (isPrivate: boolean) => void;
}

const segmentClassName =
  'label-medium flex h-full items-center justify-center uppercase tracking-[1px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Private / Public segmented control for publishing a collection.
 */
export function CollectionVisibilityToggle({
  isPrivate,
  disabled = false,
  onIsPrivateChange,
}: CollectionVisibilityToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Publish this collection"
      className="flex w-full items-center gap-[42px]"
    >
      <span className="title5 min-w-0 flex-1 text-[#171717]">
        Publish this Collection?
      </span>
      <div className="flex h-10 w-[158px] shrink-0 items-stretch gap-1 border-b border-r border-t border-[#DBDBDB]">
        <button
          type="button"
          role="radio"
          aria-checked={isPrivate}
          disabled={disabled}
          onClick={() => {
            if (!isPrivate) onIsPrivateChange(true);
          }}
          className={cn(
            segmentClassName,
            'gap-0.5 px-1 py-1',
            isPrivate
              ? 'bg-[#DBDBDB] text-[#171717]'
              : 'bg-transparent text-[#757575]'
          )}
        >
          <span className="relative size-4 shrink-0 overflow-clip">
            <Image
              src="/eye-crossed.svg"
              alt=""
              width={16}
              height={16}
              className="size-4"
            />
          </span>
          Private
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!isPrivate}
          disabled={disabled}
          onClick={() => {
            if (isPrivate) onIsPrivateChange(false);
          }}
          className={cn(
            segmentClassName,
            'min-w-0 flex-1 py-1',
            !isPrivate
              ? 'bg-[#DBDBDB] text-[#171717]'
              : 'bg-white text-[#757575]'
          )}
        >
          Public
        </button>
      </div>
    </div>
  );
}
