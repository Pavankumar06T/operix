require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createSampleClient() {
  const email = 'client@example.com';
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create User
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: passwordHash,
      name: 'Acme Corp Client',
      role: 'client',
      is_active: true
    })
    .select('id')
    .single();

  if (userError) {
    console.error('Failed to create user:', userError);
    return;
  }

  // 2. Create Client Record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      company_name: 'Acme Corp',
      contact_name: 'John Smith',
      contact_email: email
    })
    .select('id')
    .single();

  if (clientError) {
    console.error('Failed to create client record:', clientError);
    return;
  }

  // 3. Attach Client to an existing active project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('name', 'Nexus Global ERP Migration')
    .single();

  if (project) {
    await supabase
      .from('projects')
      .update({ client_id: client.id })
      .eq('id', project.id);
    console.log('Successfully attached Acme Corp to Nexus Global ERP Migration.');
  }

  console.log('Sample client created! Email: client@example.com | Password: password123');
}

createSampleClient();
