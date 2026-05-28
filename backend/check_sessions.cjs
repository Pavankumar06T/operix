require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { data, error } = await supabase.from('login_sessions').select('*').limit(5);
  console.log('Login Sessions:', data, 'Error:', error);
}
check();
