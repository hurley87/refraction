import Link from 'next/link';
import { Loader2, Pencil, Plus, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpendExperience } from '@/lib/types';

export type SpendExperienceListProps = {
  experiences: SpendExperience[];
  isLoading: boolean;
  onNew: () => void;
  onEdit: (exp: SpendExperience) => void;
};

export function SpendExperienceList({
  experiences,
  isLoading,
  onNew,
  onEdit,
}: SpendExperienceListProps) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717]">
            Spend experiences
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Pilot defaults: 1000 points = $1 USDC, max $5 per user (adjust per
            experience).
          </p>
        </div>
        <Button
          type="button"
          onClick={onNew}
          className="gap-1 bg-black text-white hover:bg-black/85"
        >
          <Plus className="size-4" />
          New experience
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-neutral-500" />
        </div>
      ) : experiences.length === 0 ? (
        <p className="text-neutral-600">No spend experiences yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {experiences.map((exp) => (
            <li
              key={exp.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[#171717]">{exp.title}</div>
                <div className="text-sm text-neutral-500">
                  <span className="capitalize">{exp.status}</span>
                  {' · '}
                  {exp.points_to_usdc_rate} pts / $1 · max $
                  {exp.max_usdc_per_user} USDC
                </div>
                <div className="mt-0.5 font-mono text-xs text-blue-600">
                  /spend/{exp.id}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  asChild
                >
                  <Link href={`/admin/spend-experiences/${exp.id}/qr`}>
                    <QrCode className="size-3.5" />
                    QR
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => onEdit(exp)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
