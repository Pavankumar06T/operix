require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function revert() {
  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'planning' })
    .eq('status', 'active')
    .select();
  
  console.log('Reverted projects:', data?.length);
}
revert();
