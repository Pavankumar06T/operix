// ═══════════════════════════════════════════════════════
// B1: Supabase Client — Database Connection
// ═══════════════════════════════════════════════════════

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Supabase] ❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Test the Supabase connection by querying the users table.
 * Exits the process if connection fails — fail fast on startup.
 */
export const testConnection = async (): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (error) throw error

    const userCount = data?.length ?? 0
    console.log(`[Supabase] ✅ Database connected (${userCount} user${userCount !== 1 ? 's' : ''} found)`)
  } catch (err) {
    console.error('[Supabase] ❌ Connection failed:', err)
    process.exit(1)
  }
}
