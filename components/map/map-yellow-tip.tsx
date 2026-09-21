'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type MapYellowTipPointer = 'top' | 'bottom';
type MapYellowTipPointerAlign = 'center' | 'start' | 'end';

type MapYellowTipProps = {
  children: ReactNode;
  /** Omit for tips that stay until the underlying task is done. */
  onDismiss?: () => void;
  className?: string;
  /**
   * Speech-bubble caret. `top` points up at the control above the tip;
   * `bottom` points down at the control below it.
   */
  pointer?: MapYellowTipPointer;
  /** Horizontal caret alignment. Defaults to the center of the bubble. */
  pointerAlign?: MapYellowTipPointerAlign;
};

const POINTER_DIR_CLASS: Record<MapYellowTipPointer, string> = {
  top: 'absolute top-0 z-10 h-0 w-0 -translate-y-full border-x-8 border-b-[10px] border-x-transparent border-b-[#FFF200]',
  bottom:
    'absolute bottom-0 z-10 h-0 w-0 translate-y-full border-x-8 border-t-[10px] border-x-transparent border-t-[#FFF200]',
};

const POINTER_ALIGN_CLASS: Record<MapYellowTipPointerAlign, string> = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-6',
  end: 'right-6',
};

/**
 * Dismissible yellow coaching bubble used on the map (list-create, search).
 */
export function MapYellowTip({
  children,
  onDismiss,
  className,
  pointer,
  pointerAlign = 'center',
}: MapYellowTipProps) {
  return (
    <div role="status" className={cn('relative', className)}>
      {pointer ? (
        <span
          data-testid="map-yellow-tip-pointer"
          data-pointer={pointer}
          data-pointer-align={pointerAlign}
          aria-hidden
          className={cn(
            POINTER_DIR_CLASS[pointer],
            POINTER_ALIGN_CLASS[pointerAlign]
          )}
        />
      ) : null}
      <div className="relative rounded-2xl bg-[#FFF200] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-[#171717]/opacity-70 transition-opacity hover:opacity-100"
            aria-label="Dismiss tip"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        <div className={cn('body-medium text-[#171717]', onDismiss && 'pr-8')}>
          {children}
        </div>
      </div>
    </div>
  );
}
