'use client';

import { useMemo, useState } from 'react';

import CityGuideListCard from '@/components/city-guides/city-guide-list-card';
import CityGuidesContentFilterRow, {
  type CityGuidesContentFilter,
  type CityGuidesSortOrder,
} from '@/components/city-guides/city-guides-content-filter-row';
import type { GuideHubListItem } from '@/lib/db/guides';

function publishedTimestamp(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function filterByKind(
  entries: GuideHubListItem[],
  filter: CityGuidesContentFilter
): GuideHubListItem[] {
  if (filter === 'all') return entries;
  if (filter === 'guides') {
    return entries.filter((e) => e.kind === 'city_guide');
  }
  return entries.filter((e) => e.kind === 'editorial');
}

function sortByPublishedAt(
  entries: GuideHubListItem[],
  order: CityGuidesSortOrder
): GuideHubListItem[] {
  const next = [...entries];
  next.sort((a, b) => {
    const ta = publishedTimestamp(a.publishedAt);
    const tb = publishedTimestamp(b.publishedAt);
    return order === 'date-desc' ? tb - ta : ta - tb;
  });
  return next;
}

export function CityGuidesHubSection({
  entries,
}: {
  entries: GuideHubListItem[];
}) {
  const [filter, setFilter] = useState<CityGuidesContentFilter>('all');
  const [sortOrder, setSortOrder] = useState<CityGuidesSortOrder>('date-desc');

  const visible = useMemo(() => {
    return sortByPublishedAt(filterByKind(entries, filter), sortOrder);
  }, [entries, filter, sortOrder]);

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'date-desc' ? 'date-asc' : 'date-desc'));
  };

  const emptyMessage =
    entries.length === 0
      ? 'No guides to show yet.'
      : 'No guides match this filter.';

  return (
    <>
      <CityGuidesContentFilterRow
        selectedFilter={filter}
        sortOrder={sortOrder}
        onFilterChange={setFilter}
        onSortToggle={toggleSort}
      />

      <div className="flex flex-col">
        {visible.length === 0 ? (
          <p className="body-medium py-8 text-center text-[#757575]">
            {emptyMessage}
          </p>
        ) : (
          visible.map((item, index) => (
            <CityGuideListCard
              key={item.id}
              guideKind={item.guideKind}
              title={item.title}
              titleHighlightWords={item.titleHighlightWords}
              preview={item.preview}
              publishedAt={item.publishedAt}
              imageSrc={item.imageSrc}
              imageAlt={item.imageAlt}
              readHref={item.readHref}
              authors={item.authors}
              className={index === 0 ? 'border-t-0' : undefined}
            />
          ))
        )}
      </div>
    </>
  );
}
