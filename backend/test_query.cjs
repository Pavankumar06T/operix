const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const clientId = 'cb7c501f-01c1-4af0-a0e3-fe9e5533eaf0';
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id, name, status, start_date, end_date,
      tasks(id, status, progress, deadline, title)
    `)
    .eq('client_id', clientId);

  console.log('Error:', error);
  console.log('Projects:', JSON.stringify(projects, null, 2));
}

run();
