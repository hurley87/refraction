import { slugify } from '@/lib/db/cities';
import { supabase } from '@/lib/db/client';

/** Derive a URL-safe list slug from a title. */
export function slugifyListTitle(title: string): string {
  const slug = slugify(title);
  return slug || 'list';
}

/**
 * Pick a slug unique for this player. Appends `-2`, `-3`, … when the base is taken.
 */
export async function allocateUniquePlayerListSlug(
  playerId: number,
  title: string,
  excludeListId?: string
): Promise<string> {
  const base = slugifyListTitle(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from('player_custom_lists')
      .select('id')
      .eq('player_id', playerId)
      .eq('slug', candidate)
      .limit(1);

    if (error) throw error;

    const row = data?.[0];
    const isTaken = row != null && row.id !== excludeListId;
    if (!isTaken) return candidate;

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

/** Persist a slug when missing (e.g. legacy rows before slug column). */
export async function ensurePlayerCustomListSlug(
  playerId: number,
  listId: string,
  title: string
): Promise<string> {
  const { data: existing, error } = await supabase
    .from('player_custom_lists')
    .select('slug')
    .eq('id', listId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) throw error;
  if (existing?.slug) return existing.slug;

  const slug = await allocateUniquePlayerListSlug(playerId, title, listId);
  const { error: updateError } = await supabase
    .from('player_custom_lists')
    .update({ slug })
    .eq('id', listId)
    .eq('player_id', playerId);

  if (updateError) throw updateError;
  return slug;
}

/** Store a retired slug so /map/{username}/{old-slug} can 301 to the new URL. */
export async function recordPlayerListSlugRedirect(
  playerId: number,
  listId: string,
  oldSlug: string
): Promise<void> {
  const normalized = oldSlug.trim().toLowerCase();
  if (!normalized) return;

  const { error } = await supabase
    .from('player_custom_list_slug_redirects')
    .upsert(
      {
        player_id: playerId,
        list_id: listId,
        old_slug: normalized,
      },
      { onConflict: 'player_id,old_slug', ignoreDuplicates: true }
    );

  if (error) throw error;
}

/**
 * When a list title changes, derive a new slug from the title and retire the old one.
 * No-op when the slug would not change.
 */
export async function rotatePlayerListSlugForTitle(
  playerId: number,
  listId: string,
  currentSlug: string | null | undefined,
  newTitle: string
): Promise<string> {
  const nextSlug = await allocateUniquePlayerListSlug(
    playerId,
    newTitle,
    listId
  );
  const previous = currentSlug?.trim().toLowerCase() || null;

  if (previous === nextSlug) {
    return nextSlug;
  }

  if (previous) {
    await recordPlayerListSlugRedirect(playerId, listId, previous);
  }

  const { error } = await supabase
    .from('player_custom_lists')
    .update({ slug: nextSlug })
    .eq('id', listId)
    .eq('player_id', playerId);

  if (error) throw error;
  return nextSlug;
}
