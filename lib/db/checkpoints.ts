import { supabase } from "./client";
import type { Checkpoint, ChainType } from "../types";

/**
 * Generate a short, URL-friendly ID for checkpoints
 * Uses crypto.randomUUID and takes first 10 chars for a short URL
 */
const generateCheckpointId = () => {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return uuid.slice(0, 10);
};

/**
 * Create a new checkpoint
 * @param checkpoint - Checkpoint data without id, created_at, updated_at
 * @param id - Optional checkpoint ID. If not provided, generates a new one.
 */
export const createCheckpoint = async (
  checkpoint: Omit<Checkpoint, "id" | "created_at" | "updated_at">,
  id?: string,
): Promise<Checkpoint> => {
  const checkpointId = id || generateCheckpointId();

  const { data, error } = await supabase
    .from("checkpoints")
    .insert({ ...checkpoint, id: checkpointId })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get a checkpoint by ID
 */
export const getCheckpointById = async (
  id: string,
): Promise<Checkpoint | null> => {
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

/**
 * Get an active checkpoint by ID (for public access)
 */
export const getActiveCheckpointById = async (
  id: string,
): Promise<Checkpoint | null> => {
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

/**
 * List all checkpoints (admin)
 */
export const listAllCheckpoints = async (): Promise<Checkpoint[]> => {
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * List active checkpoints only
 */
export const listActiveCheckpoints = async (): Promise<Checkpoint[]> => {
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Update a checkpoint
 */
export const updateCheckpoint = async (
  id: string,
  updates: Partial<Omit<Checkpoint, "id" | "created_at">>,
): Promise<Checkpoint> => {
  const { data, error } = await supabase
    .from("checkpoints")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a checkpoint
 */
export const deleteCheckpoint = async (id: string): Promise<void> => {
  const { error } = await supabase.from("checkpoints").delete().eq("id", id);

  if (error) throw error;
};

/**
 * Toggle checkpoint active status
 */
export const toggleCheckpointActive = async (
  id: string,
  isActive: boolean,
): Promise<Checkpoint> => {
  return updateCheckpoint(id, { is_active: isActive });
};

/**
 * Get checkpoints by chain type
 */
export const getCheckpointsByChainType = async (
  chainType: ChainType,
): Promise<Checkpoint[]> => {
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("chain_type", chainType)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};
