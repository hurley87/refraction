import { cn } from '@/lib/utils';

export type WelcomeEllipseProps = {
  className?: string;
  /** Renders at this pixel size; matches former 24×24 `ellipse.svg` usage. @default 24 */
  size?: number;
};

/** Yellow (#FFF200) dot beside section labels (same as hero “Welcome to IRL”). */
export function WelcomeEllipse({ className, size = 24 }: WelcomeEllipseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('aspect-square shrink-0 self-stretch', className)}
      aria-hidden
    >
      <path
        d="M12 21C7.03684 21 3 16.9632 3 12C3 7.03685 7.03684 3 12 3C16.9632 3 21 7.03685 21 12C21 16.9632 16.9632 21 12 21Z"
        fill="#FFF200"
      />
    </svg>
  );
}
