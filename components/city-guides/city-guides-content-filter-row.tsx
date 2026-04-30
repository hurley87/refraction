'use client';

import { cn } from '@/lib/utils';

export type CityGuidesContentFilter = 'all' | 'guides' | 'editorials';

export type CityGuidesSortOrder = 'date-desc' | 'date-asc';

const OPTIONS: { key: CityGuidesContentFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'guides', label: 'City Guides' },
  { key: 'editorials', label: 'Editorials' },
];

/** Same paths as `public/filter.svg` (rewards page), stroke for #171717. */
function FilterIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 23 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none shrink-0"
      aria-hidden
    >
      <path
        d="M2 7H20M5.78947 12H16.2105M9.57895 17H12.4211"
        stroke="#171717"
      />
    </svg>
  );
}

export interface CityGuidesContentFilterRowProps {
  selectedFilter: CityGuidesContentFilter;
  sortOrder: CityGuidesSortOrder;
  onFilterChange: (filter: CityGuidesContentFilter) => void;
  onSortToggle: () => void;
}

/**
 * Sorting/filter row: segmented control (298px) + 16px gap + sort (55×52).
 * Controlled by parent so filtering applies to the guides list.
 */
export default function CityGuidesContentFilterRow({
  selectedFilter,
  sortOrder,
  onFilterChange,
  onSortToggle,
}: CityGuidesContentFilterRowProps) {
  return (
    <div
      className="mx-auto flex h-[52px] w-full max-w-[369px] items-stretch gap-4 border-b border-[#E5E5E5]"
      role="region"
      aria-label="Content filter"
    >
      <div
        className="flex h-[52px] w-[298px] shrink-0 gap-1"
        role="group"
        aria-label="Filter by content type"
      >
        {OPTIONS.map(({ key, label }) => {
          const isSelected = selectedFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key)}
              aria-pressed={isSelected}
              className={cn(
                'flex min-h-0 min-w-0 flex-1 flex-row items-center justify-center gap-2 border-0 py-1 text-base font-medium font-grotesk leading-4 tracking-[-0.08em] outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2',
                isSelected
                  ? 'bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] text-[#171717]'
                  : 'bg-transparent text-[#757575]'
              )}
            >
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSortToggle}
        className={cn(
          'box-border flex h-[52px] w-[55px] shrink-0 items-center justify-center p-4 outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2'
        )}
        aria-label={
          sortOrder === 'date-desc'
            ? 'Sort by date, newest first. Click to show oldest first.'
            : 'Sort by date, oldest first. Click to show newest first.'
        }
      >
        <FilterIcon />
      </button>
    </div>
  );
}
