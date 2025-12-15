import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Supabase client instance with service role permissions.
 * Use this for server-side operations that require elevated privileges.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

