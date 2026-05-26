'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SponsoredActivationDetailRowProps = {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  className?: string;
  /** Skip default value typography (e.g. bordered badge). */
  bareValue?: boolean;
};

export function SponsoredActivationDetailRow({
  label,
  value,
  subValue,
  className,
  bareValue,
}: SponsoredActivationDetailRowProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-[#171717]/10 py-3 last:border-b-0',
        className
      )}
    >
      <span className="label-small shrink-0 font-grotesk uppercase tracking-wide text-[#757575]">
        {label}
      </span>
      <div className="min-w-0 text-right">
        {bareValue ? (
          <div className="flex justify-end">{value}</div>
        ) : (
          <div className="body-medium font-grotesk font-semibold text-[#171717]">
            {value}
          </div>
        )}
        {subValue ? (
          <div className="mt-0.5 body-small font-grotesk font-semibold text-[#e53935]">
            {subValue}
          </div>
        ) : null}
      </div>
    </div>
  );
}
