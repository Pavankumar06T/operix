require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function reset() {
  const hash = await bcrypt.hash('password123', 12);
  const { data, error } = await supabase.from('users').update({ password_hash: hash }).eq('email', 'ravi@kaisenspark.com');
  console.log('Updated Ravi password to password123:', { data, error });
}
reset();
