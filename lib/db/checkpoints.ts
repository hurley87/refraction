import { supabase } from './client';
import type { Checkpoint, ChainType } from '../types';

// Select specific columns for checkpoint queries
const CHECKPOINT_COLUMNS = `
  id,
  name,
  description,
  login_cta_text,
  chain_type,
  checkpoint_mode,
  points_value,
  is_active,
  created_by,
  partner_image_url,
  created_at,
  updated_at
`;

const CHECKPOINT_COLUMNS_LEGACY = `
  id,
  name,
  description,
  login_cta_text,
  chain_type,
  points_value,
  is_active,
  created_by,
  partner_image_url,
  created_at,
  updated_at
`;

const hasMissingCheckpointModeColumn = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    (maybeError.code === 'PGRST204' || maybeError.code === '42703') &&
    typeof maybeError.message === 'string' &&
    maybeError.message.includes('checkpoint_mode')
  );
};

const normalizeCheckpoint = (checkpoint: any): Checkpoint => ({
  ...checkpoint,
  checkpoint_mode: checkpoint?.checkpoint_mode || 'checkin',
});

const normalizeCheckpoints = (checkpoints: any[] | null | undefined) =>
  (checkpoints || []).map(normalizeCheckpoint);

/**
 * Generate a short, URL-friendly ID for checkpoints
 * Uses crypto.randomUUID and takes first 10 chars for a short URL
 */
const generateCheckpointId = () => {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return uuid.slice(0, 10);
};

/**
 * Create a new checkpoint
 * @param checkpoint - Checkpoint data without id, created_at, updated_at
 * @param id - Optional checkpoint ID. If not provided, generates a new one.
 */
export const createCheckpoint = async (
  checkpoint: Omit<Checkpoint, 'id' | 'created_at' | 'updated_at'>,
  id?: string
): Promise<Checkpoint> => {
  const checkpointId = id || generateCheckpointId();
  const payload = { ...checkpoint, id: checkpointId };

  let { data, error } = await supabase
    .from('checkpoints')
    .insert(payload)
    .select(CHECKPOINT_COLUMNS)
    .single();

  if (hasMissingCheckpointModeColumn(error)) {
    if (checkpoint.checkpoint_mode === 'spend') {
      throw new Error(
        'Database schema is missing checkpoint_mode. Apply checkpoint migrations before creating spend checkpoints.'
      );
    }
    const legacyPayload = { ...payload } as Record<string, unknown>;
    delete legacyPayload.checkpoint_mode;
    const fallbackResult = await supabase
      .from('checkpoints')
      .insert(legacyPayload)
      .select(CHECKPOINT_COLUMNS_LEGACY)
      .single();
    data = fallbackResult.data as any;
    error = fallbackResult.error;
  }

  if (error) throw error;
  return normalizeCheckpoint(data);
};

/**
 * Get a checkpoint by ID
 */
export const getCheckpointById = async (
  id: string
): Promise<Checkpoint | null> => {
  let { data, error } = await supabase
    .from('checkpoints')
    .select(CHECKPOINT_COLUMNS)
    .eq('id', id)
    .single();

  if (hasMissingCheckpointModeColumn(error)) {
    const fallbackResult = await supabase
      .from('checkpoints')
      .select(CHECKPOINT_COLUMNS_LEGACY)
      .eq('id', id)
      .single();
    data = fallbackResult.data as any;
    error = fallbackResult.error;
  }

  if (error && error.code !== 'PGRST116') throw error;
  return data ? normalizeCheckpoint(data) : null;
};

/**
 * Get an active checkpoint by ID (for public access)
 */
export const getActiveCheckpointById = async (
  id: string
): Promise<Checkpoint | null> => {
  let { data, error } = await supabase
    .from('checkpoints')
    .select(CHECKPOINT_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (hasMissingCheckpointModeColumn(error)) {
    const fallbackResult = await supabase
      .from('checkpoints')
      .select(CHECKPOINT_COLUMNS_LEGACY)
      .eq('id', id)
      .eq('is_active', true)
      .single();
    data = fallbackResult.data as any;
    error = fallbackResult.error;
  }

  if (error && error.code !== 'PGRST116') throw error;
  return data ? normalizeCheckpoint(data) : null;
};

/**
 * List all checkpoints (admin)
 */
export const listAllCheckpoints = async (): Promise<Checkpoint[]> => {
  let { data, error } = await supabase
    .from('checkpoints')
    .select(CHECKPOINT_COLUMNS)
    .order('created_at', { ascending: false });

  if (hasMissingCheckpointModeColumn(error)) {
    const fallbackResult = await supabase
      .from('checkpoints')
      .select(CHECKPOINT_COLUMNS_LEGACY)
      .order('created_at', { ascending: false });
    data = fallbackResult.data as any;
    error = fallbackResult.error;
  }

  if (error) throw error;
  return normalizeCheckpoints(data);
};

/**
 * List active checkpoints only
 */
export const listActiveCheckpoints = async (): Promise<Checkpoint[]> => {
  let { data, error } = await supabase
    .from('checkpoints')
    .select(CHECKPOINT_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (hasMissingCheckpointModeColumn(error)) {
    const fallbackResult = await supabase
      .from('checkpoints')
      .select(CHECKPOINT_COLUMNS_LEGACY)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    data = fallbackResult.data as any;
    error = fallbackResult.error;
  }

  if (error) throw error;
  return normalizeCheckpoints(data);
};

/**
 * Update a checkpoint
 */
export const updateCheckpoint = async (
  id: string,
  updates: Partial<Omit<Checkpoint, 'id' | 'created_at'>>
): Promise<Checkpoint> => {
  let { data, error } = await supabase
    .from('checkpoints')
    .update(updates)
    .eq('id', id)
    .select(CHECKPOINT_COLUMNS)
    .single();

  if (hasMissingCheckpointModeColumn(error)) {
    if (updates.checkpoint_mode === 'spend') {
      throw new Error(
        'Database schema is missing checkpoint_mode. Apply checkpoint migrations before setting spend mode.'
      );
    }
    const legacyUpdates = { ...updates } as Record<string, unknown>;
    delete legacyUpdates.checkpoint_mode;
    const fallbackResult = await supabase
      .from('checkpoints')
      .update(legacyUpdates)
      .eq('id', id)
      .select(CHECKPOINT_COLUMNS_LEGACY)
      .single();
    data = fallbackResult.data as any;
    error = fallbackResult.error;
  }

  if (error) throw error;
  return normalizeCheckpoint(data);
};

/**
 * Delete a checkpoint
 */
export const deleteCheckpoint = async (id: string): Promise<void> => {
  const { error } = await supabase.from('checkpoints').delete().eq('id', id);

  if (error) throw error;
};

/**
 * Toggle checkpoint active status
 */
export const toggleCheckpointActive = async (
  id: string,
  isActive: boolean
): Promise<Checkpoint> => {
  return updateCheckpoint(id, { is_active: isActive });
};

/**
 * Get checkpoints by chain type
 */
export const getCheckpointsByChainType = async (
  chainType: ChainType
): Promise<Checkpoint[]> => {
  let { data, error } = await supabase
    .from('checkpoints')
    .select(CHECKPOINT_COLUMNS)
    .eq('chain_type', chainType)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (hasMissingCheckpointModeColumn(error)) {
    const fallbackResult = await supabase
      .from('checkpoints')
      .select(CHECKPOINT_COLUMNS_LEGACY)
      .eq('chain_type', chainType)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    data = fallbackResult.data as any;
    error = fallbackResult.error;
  }

  if (error) throw error;
  return normalizeCheckpoints(data);
};
