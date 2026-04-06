import { apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

// DELETE /api/perks/codes/[codeId] — use /api/admin/perks/codes/[codeId] (admin only)
export async function DELETE() {
  return apiError('Forbidden', 403);
}
