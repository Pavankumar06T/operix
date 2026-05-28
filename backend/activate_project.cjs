require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function activate() {
  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'active' })
    .eq('status', 'planning')
    .select();
  
  console.log('Activated projects:', data?.length);
}
activate();
