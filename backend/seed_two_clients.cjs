const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const newPasswordHash = await bcrypt.hash('password123', 10);
  
  const clientsToCreate = [
    {
      email: 'nexus@kaisenspark.com',
      name: 'Nexus Dynamics',
      company: 'Nexus Dynamics Inc.'
    },
    {
      email: 'horizon@kaisenspark.com',
      name: 'Horizon Tech',
      company: 'Horizon Technologies'
    }
  ];

  // Fetch two active projects
  const { data: projects } = await supabase.from('projects').select('id, name').limit(2);
  if (!projects || projects.length < 2) {
    console.error('Not enough projects found in the DB to assign to two clients.');
    return;
  }

  for (let i = 0; i < clientsToCreate.length; i++) {
    const c = clientsToCreate[i];
    
    // 1. Create User
    const { data: user, error: uError } = await supabase
      .from('users')
      .insert({
        email: c.email,
        password_hash: newPasswordHash,
        role: 'client',
        name: c.name
      })
      .select()
      .single();

    if (uError) {
      console.error(`Error creating user ${c.email}:`, uError);
      continue;
    }

    // 2. Create Client Profile
    const { data: clientProfile, error: cError } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        company_name: c.company,
        contact_name: c.name,
        contact_email: c.email
      })
      .select()
      .single();

    if (cError) {
      console.error(`Error creating client profile ${c.company}:`, cError);
      continue;
    }

    // 3. Assign Project
    const projectId = projects[i].id;
    const { error: pError } = await supabase
      .from('projects')
      .update({ client_id: clientProfile.id })
      .eq('id', projectId);

    if (pError) {
      console.error(`Error assigning project to ${c.company}:`, pError);
    } else {
      console.log(`Successfully created ${c.company} (${c.email}) and assigned project: ${projects[i].name}`);
    }
  }
}

run();
