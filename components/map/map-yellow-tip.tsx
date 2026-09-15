'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type MapYellowTipProps = {
  children: ReactNode;
  onDismiss: () => void;
  className?: string;
  /** Speech-bubble caret. `top` points up at the control the tip is attached to. */
  pointer?: 'top';
};

/**
 * Dismissible yellow coaching bubble used on the map (list-create, search).
 */
export function MapYellowTip({
  children,
  onDismiss,
  className,
  pointer,
}: MapYellowTipProps) {
  return (
    <div role="status" className={cn('relative', className)}>
      {pointer === 'top' ? (
        <span
          data-testid="map-yellow-tip-pointer"
          aria-hidden
          className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 -translate-y-full border-x-8 border-b-[10px] border-x-transparent border-b-[#FFF200]"
        />
      ) : null}
      <div className="relative rounded-2xl bg-[#FFF200] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-[#171717]/opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss tip"
        >
          <X className="size-4" aria-hidden />
        </button>
        <p className="body-medium pr-8 text-[#171717]">{children}</p>
      </div>
    </div>
  );
}
