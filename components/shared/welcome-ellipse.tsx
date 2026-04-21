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
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <circle cx={8} cy={8} r={8} fill="#FFF200" />
    </svg>
  );
}
