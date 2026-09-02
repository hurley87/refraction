import { getPerkById } from '@/lib/db/perks';
import type { Perk } from '@/lib/types';
import { isPerkShareable } from './perk-share-card';

/**
 * Perk behind a shared /rewards link, or null when the link should keep the
 * site-wide preview (unknown id, or a perk the catalog would not open).
 */
export async function loadShareablePerk(perkId: string): Promise<Perk | null> {
  const id = perkId.trim();
  if (!id) return null;

  try {
    const perk = (await getPerkById(id)) as Perk | null;
    if (!perk) return null;
    return isPerkShareable(perk) ? perk : null;
  } catch {
    return null;
  }
}
