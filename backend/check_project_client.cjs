require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, client_id, status')
    .eq('name', 'Nexus Global ERP Migration')
    .single();
  
  console.log('Project:', project);

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, user_id, user:users!clients_user_id_fkey(email)');
    
  console.log('All Clients:', JSON.stringify(clients, null, 2));
}

check();
