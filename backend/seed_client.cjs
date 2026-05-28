const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const newPasswordHash = await bcrypt.hash('password123', 10);
  
  // Create the client user
  const { data: clientUser, error } = await supabase
    .from('users')
    .insert({
      email: 'client@kaisenspark.com',
      password_hash: newPasswordHash,
      role: 'client',
      name: 'ACME Corp Client'
    })
    .select()
    .single();

  if (error) {
     console.error('Error creating client:', error);
     return;
  }
  
  console.log('Created Client:', clientUser.id);

  // Find a project to assign to this client so they have something to see
  const { data: project } = await supabase.from('projects').select('id').limit(1).single();
  if (project) {
     const { error: pError } = await supabase.from('projects').update({ client_id: clientUser.id }).eq('id', project.id);
     if (pError) console.error('Error assigning project:', pError);
     else console.log('Assigned project to client!');
  }
}

run();
