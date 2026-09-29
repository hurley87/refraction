'use client';

import { useEffect } from 'react';

import { useAnalytics } from '@/hooks/useAnalytics';
import { compactAnalyticsEventProps } from '@/lib/analytics/compact-props';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { mapListViewedProperties } from '@/lib/analytics/guide-map';

/**
 * Fires `map_list_viewed` once per list visit. `guide_slug` comes from
 * `?returnTo=/city-guides/<slug>` when the visitor arrived from a guide.
 */
export function MapListViewedTracker({
  mapListSlug,
  returnTo,
}: {
  mapListSlug: string;
  returnTo: string | null;
}) {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(
      ANALYTICS_EVENTS.MAP_LIST_VIEWED,
      compactAnalyticsEventProps(
        mapListViewedProperties({ mapListSlug, returnTo })
      )
    );
  }, [mapListSlug, returnTo, trackEvent]);

  return null;
}
