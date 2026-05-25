'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const COMPLETE_RATIO = 0.82;

type SponsoredActivationSwipeSliderProps = {
  disabled: boolean;
  onComplete: () => void;
  label?: string;
};

/**
 * Drag-to-complete slider — requires deliberate swipe (not a single tap).
 */
export function SponsoredActivationSwipeSlider({
  disabled,
  onComplete,
  label = 'Swipe to redeem',
}: SponsoredActivationSwipeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [dragPx, setDragPx] = useState(0);
  const dragPxRef = useRef(0);
  const [completed, setCompleted] = useState(false);
  const completionSentRef = useRef(false);
  const activePointerId = useRef<number | null>(null);

  const maxTravel = useCallback(() => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return 0;
    return Math.max(0, track.clientWidth - knob.offsetWidth - 8);
  }, []);

  const finishIfNeeded = useCallback(
    (px: number) => {
      if (completionSentRef.current) return;
      const max = maxTravel();
      if (max <= 0) return;
      if (px >= max * COMPLETE_RATIO) {
        completionSentRef.current = true;
        setCompleted(true);
        setDragPx(max);
        dragPxRef.current = max;
        onComplete();
      }
    },
    [maxTravel, onComplete]
  );

  useEffect(() => {
    if (disabled || completed) return;
    completionSentRef.current = false;
    setDragPx(0);
    dragPxRef.current = 0;
  }, [disabled, completed]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || completed) return;
    activePointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || completed) return;
    if (activePointerId.current !== e.pointerId) return;
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return;
    const rect = track.getBoundingClientRect();
    const knobW = knob.offsetWidth;
    const max = Math.max(0, rect.width - knobW - 8);
    const x = e.clientX - rect.left - knobW / 2;
    const clamped = Math.min(max, Math.max(0, x));
    dragPxRef.current = clamped;
    setDragPx(clamped);
    finishIfNeeded(clamped);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    if (disabled || completed) return;
    const max = maxTravel();
    const px = dragPxRef.current;
    if (max > 0 && px < max * COMPLETE_RATIO) {
      dragPxRef.current = 0;
      setDragPx(0);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || completed || completionSentRef.current) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      completionSentRef.current = true;
      const max = maxTravel();
      dragPxRef.current = max;
      setDragPx(max);
      setCompleted(true);
      onComplete();
    }
  };

  return (
    <div className="w-full">
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          completed
            ? 100
            : Math.round((dragPx / Math.max(1, maxTravel())) * 100)
        }
        aria-disabled={disabled || completed}
        aria-label={label}
        tabIndex={disabled || completed ? -1 : 0}
        onKeyDown={onKeyDown}
        className={cn(
          'relative flex h-14 w-full select-none items-center rounded-full border border-white/15 bg-black/40 px-1',
          disabled || completed ? 'opacity-50' : 'cursor-pointer'
        )}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="label-small font-grotesk text-white/50">
            {completed ? 'Redeemed' : label}
          </span>
        </div>
        <div
          ref={knobRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ transform: `translateX(${dragPx}px)` }}
          className={cn(
            'relative z-10 flex h-12 w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-[#FFF200] text-[#0a0a0a] shadow-md',
            disabled || completed ? 'pointer-events-none' : 'touch-none'
          )}
        >
          <span className="text-lg" aria-hidden>
            →
          </span>
        </div>
      </div>
      <p className="mt-2 body-small font-grotesk text-white/40">
        Slide the button all the way right. Keyboard: focus the track, then
        press Enter.
      </p>
    </div>
  );
}
