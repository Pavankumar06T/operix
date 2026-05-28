import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'weekly_reports' })
  // If rpc doesn't exist, we can use raw query or just insert a dummy row to get the error stating missing columns
  const { error: insErr } = await supabase.from('weekly_reports').insert({}).select()
  console.log('Insert Error:', insErr)
}
check()
