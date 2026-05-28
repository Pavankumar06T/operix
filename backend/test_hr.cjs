require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase.from('users').insert({
    email: 'hr@example.com',
    password_hash: 'dummy',
    name: 'HR User',
    role: 'hr'
  }).select();
  if (error) {
    console.error(error);
  } else {
    console.log('Inserted HR user successfully:', data);
  }
}
check();
