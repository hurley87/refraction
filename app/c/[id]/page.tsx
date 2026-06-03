import { notFound } from 'next/navigation';
import { getActiveCheckpointById } from '@/lib/db/checkpoints';
import UnifiedCheckpoint from '@/components/checkpoint/unified-checkpoint';

/**
 * Always render from the live database. Checkpoints are admin-editable CMS
 * content, so a cached route render would show stale data ("reverting" to a
 * previous save) until the cache expired.
 */
export const dynamic = 'force-dynamic';

interface CheckpointPageProps {
  params: { id: string };
}

export default async function CheckpointPage({ params }: CheckpointPageProps) {
  const checkpoint = await getActiveCheckpointById(params.id);

  if (!checkpoint) {
    notFound();
  }

  return (
    <div className="min-h-dvh w-full font-sans">
      <UnifiedCheckpoint checkpoint={checkpoint} />
    </div>
  );
}
