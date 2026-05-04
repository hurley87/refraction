'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type SpendPrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Shows spinner and disables interaction (long wallet operations). */
  pending?: boolean;
};

/** Primary CTA aligned with homepage hero (`Find Spots Nearby`) — yellow bar + arrow. */
export function SpendPrimaryButton({
  children,
  className,
  pending,
  disabled,
  ...props
}: SpendPrimaryButtonProps) {
  const isBusy = Boolean(pending);
  return (
    <button
      type="button"
      className={cn(
        'label-large flex h-[44px] w-full cursor-pointer items-center justify-between gap-2 bg-[#FFF200] py-2 pr-2 pl-4 text-[#171717] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      disabled={disabled || isBusy}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {isBusy ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : null}
        <span className="min-w-0 truncate whitespace-nowrap text-left">
          {children}
        </span>
      </span>
      {!isBusy ? (
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden
        >
          <path
            d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
            fill="#171717"
          />
        </svg>
      ) : (
        <span className="size-6 shrink-0" aria-hidden />
      )}
    </button>
  );
}
