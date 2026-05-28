require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error } = await supabase.from('alerts').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Alerts:', data);
  }
}
check();
