'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useAnalytics } from '@/hooks/useAnalytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { guideMapClickedProperties } from '@/lib/analytics/guide-map';
import { compactAnalyticsEventProps } from '@/lib/analytics/compact-props';

type GuideMapImageLinkProps = {
  href: string;
  guideSlug: string;
  city: string;
  mapListSlug: string;
  children: ReactNode;
};

/** Guide map image. Click is `guide_map_clicked` with `placement: map_image`. */
export function GuideMapImageLink({
  href,
  guideSlug,
  city,
  mapListSlug,
  children,
}: GuideMapImageLinkProps) {
  const { trackEvent } = useAnalytics();

  return (
    <Link
      href={href}
      className="block h-full w-full transition-opacity hover:opacity-90"
      aria-label="Open this guide’s list on the IRL map"
      onClick={() => {
        trackEvent(
          ANALYTICS_EVENTS.GUIDE_MAP_CLICKED,
          compactAnalyticsEventProps(
            guideMapClickedProperties({
              guideSlug,
              city,
              mapListSlug,
            })
          )
        );
      }}
    >
      {children}
    </Link>
  );
}
