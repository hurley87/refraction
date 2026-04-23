import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface CityGuidesHubCardImageProps {
  src: string;
  alt: string;
  /** When set, the image is a link to the guide or editorial. */
  href?: string;
  /**
   * Name for the link (used as `aria-label` when `href` is set so the image can use
   * empty `alt` and avoid duplicate announcements).
   */
  linkLabel?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Non-featured hub list cards: 361×360.08 frame (matches featured scale), 8px top and
 * ~7.35px side inset, image fills the slot with `object-cover` (no side letterboxing).
 */
const shellClass =
  'mx-auto box-border flex w-full max-w-[361px] flex-col items-stretch justify-center aspect-[361/360.08] px-[7.349px] pt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2';

export function CityGuidesHubCardImage({
  src,
  alt,
  href,
  linkLabel,
  priority = false,
  className,
}: CityGuidesHubCardImageProps) {
  const linkName = (linkLabel?.trim() || alt || 'View article').trim();
  const imageAlt = href ? '' : alt;

  const frame = (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-neutral-200">
      <Image
        src={src}
        alt={imageAlt}
        fill
        priority={priority}
        className="object-cover object-center"
        sizes="(max-width: 361px) 100vw, 361px"
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(shellClass, className)}
        aria-label={linkName}
      >
        {frame}
      </Link>
    );
  }

  return <div className={cn(shellClass, className)}>{frame}</div>;
}
