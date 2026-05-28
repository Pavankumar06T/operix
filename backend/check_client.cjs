require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('email, password')
    .eq('role', 'client');
  
  if (data && data.length > 0) {
    console.log('Client found:', data[0].email);
  } else {
    console.log('No client users found.');
  }
}

check();
