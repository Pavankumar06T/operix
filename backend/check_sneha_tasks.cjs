require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { data: user } = await supabase.from('users').select('id, name').eq('email', 'sneha@kaisenspark.com').single();
  const { data: tasks } = await supabase.from('tasks').select('id, title, project_id').eq('assigned_to', user.id);
  console.log('Sneha tasks:', tasks);
  
  const { data: projects } = await supabase.from('projects').select('id, name, status');
  console.log('All Projects:', projects);
}

check();
