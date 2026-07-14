import {
  getCheckinDisplayName,
  getCheckinInitial,
  type MapCheckinAvatarEntry,
} from '@/lib/map/checkin-avatar-utils';
import { cn } from '@/lib/utils';

interface MapCheckinAvatarStackProps {
  checkins: MapCheckinAvatarEntry[];
  /** @default 3 */
  maxVisible?: number;
  className?: string;
}

/** Overlapping check-in avatars (drawer tiles + check-in modal CHECK-INS row). */
export function MapCheckinAvatarStack({
  checkins,
  maxVisible = 3,
  className,
}: MapCheckinAvatarStackProps) {
  if (checkins.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center', className)}>
      {checkins.slice(0, maxVisible).map((entry, index) => (
        <div
          key={entry.id}
          className={cn(
            'relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[8px] font-semibold leading-none text-[#313131] shadow-sm ring-1 ring-white',
            index > 0 && '-ml-[7px]'
          )}
          style={{ zIndex: index + 1 }}
        >
          {entry.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.profilePictureUrl}
              alt={getCheckinDisplayName(entry)}
              className="size-4 rounded-full object-cover"
            />
          ) : (
            getCheckinInitial(entry)
          )}
        </div>
      ))}
    </div>
  );
}
