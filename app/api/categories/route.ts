import { listActiveCategories } from '@/lib/db/categories';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** GET /api/categories — public list of active categories (for dropdowns/filters) */
export async function GET() {
  try {
    const categories = await listActiveCategories();
    const response = apiSuccess(categories);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (e) {
    console.error('Failed to list categories:', e);
    return apiError('Failed to load categories', 500);
  }
}
