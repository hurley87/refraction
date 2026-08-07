'use client';

import {
  useCallback,
  useRef,
  type DragEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type DragScrollRowProps = {
  children: ReactNode;
  className?: string;
  /** Accessible name for the scroll region. */
  'aria-label'?: string;
};

const DRAG_THRESHOLD_PX = 6;

/**
 * Horizontal overflow row with mouse/pointer drag scrolling (desktop)
 * in addition to touch / trackpad scrolling.
 *
 * Pointer capture is deferred until the drag threshold so clicks on cards
 * (thumbnails) still activate nested buttons/links.
 */
export function DragScrollRow({
  children,
  className,
  'aria-label': ariaLabel,
}: DragScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);

  const suppressClickIfDragged = useCallback((moved: boolean) => {
    if (!moved) return;
    const el = ref.current;
    if (!el) return;
    const blockClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    el.addEventListener('click', blockClick, { capture: true, once: true });
  }, []);

  /** Keep native image/link drag from stealing the carousel gesture. */
  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    const drag = dragRef.current;
    if (!el || !drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) >= DRAG_THRESHOLD_PX) {
      drag.moved = true;
      // Capture only after we know it's a drag — keeps click → map navigation working
      el.setPointerCapture(event.pointerId);
    }
    if (!drag.moved) return;

    el.scrollLeft = drag.scrollLeft - dx;
    event.preventDefault();
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const didMove = drag.moved;
    dragRef.current = null;
    suppressClickIfDragged(didMove);
    if (didMove) {
      try {
        ref.current?.releasePointerCapture(event.pointerId);
      } catch {
        // already released
      }
    }
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'flex cursor-grab gap-2 overflow-x-auto pb-1 active:cursor-grabbing',
        'touch-pan-x select-none',
        // Prevent native image drag ghost without blocking clicks on the card
        '[&_img]:[-webkit-user-drag:none]',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
      onDragStart={onDragStart}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {children}
    </div>
  );
}
