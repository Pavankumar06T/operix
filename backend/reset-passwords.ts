import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetPasswords() {
  const newPasswordHash = await bcrypt.hash('password123', 10)

  const emails = [
    'ravi@kaisenspark.com',
    'priya@kaisenspark.com',
    'amit@kaisenspark.com',
    'sneha@kaisenspark.com',
    'vikram@kaisenspark.com'
  ]

  for (const email of emails) {
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('email', email)
      .select()

    if (error) {
      console.error(`Error updating ${email}:`, error.message)
    } else {
      console.log(`Successfully updated password for ${email}`)
    }
  }
}

resetPasswords()
