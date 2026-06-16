import { supabase } from './client';
import { slugify } from './cities';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CategoryInput {
  name: string;
  isActive: boolean;
  sortOrder: number;
}

const COLUMNS = 'id, name, slug, is_active, sort_order, created_at, updated_at';

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as CategoryRow[]).map(toCategory);
}

export async function listActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as CategoryRow[]).map(toCategory);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: input.name,
      slug: slugify(input.name),
      is_active: input.isActive,
      sort_order: input.sortOrder,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toCategory(data as CategoryRow);
}

export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({
      name: input.name,
      slug: slugify(input.name),
      is_active: input.isActive,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toCategory(data as CategoryRow);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}
