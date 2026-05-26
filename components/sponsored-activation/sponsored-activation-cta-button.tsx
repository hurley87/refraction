'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check, Loader2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

type SponsoredActivationCtaButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant: 'confirm' | 'redeemed';
    pending?: boolean;
  };

export function SponsoredActivationCtaButton({
  children,
  variant,
  pending,
  disabled,
  className,
  ...props
}: SponsoredActivationCtaButtonProps) {
  const isBusy = Boolean(pending);
  const isRedeemed = variant === 'redeemed';

  let trailingIcon: ReactNode;
  if (isBusy) {
    trailingIcon = <span className="size-5 shrink-0" aria-hidden />;
  } else if (isRedeemed) {
    trailingIcon = (
      <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
    );
  } else {
    trailingIcon = (
      <Trophy className="size-5 shrink-0" strokeWidth={2} aria-hidden />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'label-large flex h-12 w-full items-center justify-between gap-2 rounded-md px-4 font-grotesk uppercase tracking-wide transition-opacity disabled:cursor-not-allowed',
        isRedeemed
          ? 'bg-[#22c55e] text-white disabled:opacity-100'
          : 'bg-[#171717] text-white hover:opacity-95 disabled:opacity-50',
        className
      )}
      disabled={disabled || isBusy || isRedeemed}
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
      {trailingIcon}
    </button>
  );
}
