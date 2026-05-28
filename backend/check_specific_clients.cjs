require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('email, role')
    .in('email', ['nexus@kaisenspark.com', 'horizon@kaisenspark.com']);
  
  console.log('Found users:', data);
}

check();
