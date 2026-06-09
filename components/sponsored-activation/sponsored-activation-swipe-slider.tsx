'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const COMPLETE_RATIO = 0.82;

type SponsoredActivationSwipeSliderProps = {
  disabled: boolean;
  onComplete: () => void;
  /** Fires when the user begins a swipe (pointer down on knob). */
  onSwipeGestureStart?: () => void;
  label?: string;
  /** True after swipe-redeem has completed successfully. */
  redeemRequestSucceeded?: boolean;
};

export function SponsoredActivationSwipeSlider({
  disabled,
  onComplete,
  onSwipeGestureStart,
  label = 'Swipe to Redeem',
  redeemRequestSucceeded = false,
}: SponsoredActivationSwipeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [dragPx, setDragPx] = useState(0);
  const dragPxRef = useRef(0);
  const [swipeCommitted, setSwipeCommitted] = useState(false);
  const completionSentRef = useRef(false);
  const activePointerId = useRef<number | null>(null);
  /** Cached max travel for a11y ratio; avoids reading layout in render. */
  const maxTravelForAriaRef = useRef(1);

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
      maxTravelForAriaRef.current = Math.max(1, max);
      if (max <= 0) return;
      if (px >= max * COMPLETE_RATIO) {
        completionSentRef.current = true;
        setSwipeCommitted(true);
        setDragPx(max);
        dragPxRef.current = max;
        onComplete();
      }
    },
    [maxTravel, onComplete]
  );

  useEffect(() => {
    if (disabled || swipeCommitted) return;
    completionSentRef.current = false;
    setDragPx(0);
    dragPxRef.current = 0;
  }, [disabled, swipeCommitted]);

  const syncMaxTravelForAria = useCallback(() => {
    maxTravelForAriaRef.current = Math.max(1, maxTravel());
  }, [maxTravel]);

  useLayoutEffect(() => {
    syncMaxTravelForAria();
    window.addEventListener('resize', syncMaxTravelForAria);
    return () => window.removeEventListener('resize', syncMaxTravelForAria);
  }, [syncMaxTravelForAria, disabled, swipeCommitted]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || swipeCommitted) return;
    onSwipeGestureStart?.();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || swipeCommitted) return;
    if (activePointerId.current !== e.pointerId) return;
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return;
    const rect = track.getBoundingClientRect();
    const knobW = knob.offsetWidth;
    const max = Math.max(0, rect.width - knobW - 8);
    maxTravelForAriaRef.current = Math.max(1, max);
    const x = e.clientX - rect.left - knobW / 2;
    const clamped = Math.min(max, Math.max(0, x));
    dragPxRef.current = clamped;
    setDragPx(clamped);
    finishIfNeeded(clamped);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    if (disabled || swipeCommitted) return;
    const max = maxTravel();
    const px = dragPxRef.current;
    if (max > 0 && px < max * COMPLETE_RATIO) {
      dragPxRef.current = 0;
      setDragPx(0);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || swipeCommitted || completionSentRef.current) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSwipeGestureStart?.();
      completionSentRef.current = true;
      const max = maxTravel();
      maxTravelForAriaRef.current = Math.max(1, max);
      dragPxRef.current = max;
      setDragPx(max);
      setSwipeCommitted(true);
      onComplete();
    }
  };

  const displayLabel = redeemRequestSucceeded
    ? 'Redeemed'
    : swipeCommitted
      ? 'Redeeming…'
      : label;

  return (
    <div className="w-full">
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          swipeCommitted
            ? 100
            : Math.round((dragPx / maxTravelForAriaRef.current) * 100)
        }
        aria-disabled={disabled || swipeCommitted}
        aria-label={displayLabel}
        tabIndex={disabled || swipeCommitted ? -1 : 0}
        onKeyDown={onKeyDown}
        className={cn(
          'relative flex h-[52px] w-full select-none items-center rounded-md border-2 border-[#171717] bg-white px-0',
          disabled ? 'opacity-60' : 'cursor-pointer',
          redeemRequestSucceeded && 'border-[#14a64a]'
        )}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="label-large font-grotesk uppercase tracking-[0.0625em] text-[#171717]">
            {displayLabel}
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
            'relative z-10 flex h-[52px] min-w-[52px] shrink-0 items-center justify-center rounded-sm px-4 text-white',
            redeemRequestSucceeded ? 'bg-[#14a64a]' : 'bg-[#171717]',
            disabled || swipeCommitted ? 'pointer-events-none' : 'touch-none'
          )}
        >
          {!swipeCommitted && (
            <Image
              src="/arrow-right.svg"
              alt=""
              width={24}
              height={24}
              aria-hidden
              className="brightness-0 invert"
            />
          )}
        </div>
      </div>
      <p className="sr-only">
        Slide the control all the way right to redeem. Keyboard: focus the
        track, then press Enter.
      </p>
    </div>
  );
}
