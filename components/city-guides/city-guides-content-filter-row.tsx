'use client';

import { cn } from '@/lib/utils';

export type CityGuidesContentFilter = 'guides' | 'editorials';

const OPTIONS: { key: CityGuidesContentFilter; label: string }[] = [
  { key: 'guides', label: 'City Guides' },
  { key: 'editorials', label: 'Editorial' },
];

export interface CityGuidesContentFilterRowProps {
  selectedFilter: CityGuidesContentFilter;
  onFilterChange: (filter: CityGuidesContentFilter) => void;
}

/**
 * Content-type row: City Guides and Editorial. Controlled by the hub list.
 */
export default function CityGuidesContentFilterRow({
  selectedFilter,
  onFilterChange,
}: CityGuidesContentFilterRowProps) {
  return (
    <div
      className="flex h-[52px] w-full items-stretch gap-4 border-b border-t border-[#E5E5E5]"
      role="region"
      aria-label="Content filter"
    >
      <div
        className="flex h-[52px] min-w-0 flex-1 gap-1"
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
              <h4 className="truncate">{label}</h4>
            </button>
          );
        })}
      </div>
    </div>
  );
}
