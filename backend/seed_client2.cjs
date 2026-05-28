const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userId = 'e9365123-32d3-4c0d-9dd1-01bb2157af3c';
  
  // Create a record in the clients table
  const { data: clientRecord, error: cError } = await supabase
    .from('clients')
    .insert({
      id: userId,
      company: 'ACME Corp',
      industry: 'Technology',
      contact_person: 'ACME Corp Client'
    })
    .select()
    .single();

  if (cError) {
     console.error('Error creating in clients table:', cError);
     return;
  }
  
  // Find a project to assign to this client so they have something to see
  const { data: project } = await supabase.from('projects').select('id').limit(1).single();
  if (project) {
     const { error: pError } = await supabase.from('projects').update({ client_id: userId }).eq('id', project.id);
     if (pError) console.error('Error assigning project:', pError);
     else console.log('Assigned project to client!');
  }
}

run();
