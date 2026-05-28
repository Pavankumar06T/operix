require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fix() {
  const nexusDynamicsId = 'cb7c501f-01c1-4af0-a0e3-fe9e5533eaf0';
  
  const { data, error } = await supabase
    .from('projects')
    .update({ client_id: nexusDynamicsId })
    .eq('name', 'Nexus Global ERP Migration');
    
  if (error) {
    console.error('Error fixing project:', error);
  } else {
    console.log('Fixed! Re-assigned Nexus Global ERP Migration back to Nexus Dynamics Inc.');
  }
}

fix();
