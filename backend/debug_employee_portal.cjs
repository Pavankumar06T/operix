require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debug() {
  const email = 'sneha@kaisenspark.com'; // assuming Sneha's email
  const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
  
  if (!user) return console.log('User not found');
  
  const userId = user.id;
  
  const { data: myTasks } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('assigned_to', userId);
    
  console.log('Sneha tasks count:', myTasks?.length);
  const projectIds = [...new Set(myTasks?.map(t => t.project_id).filter(Boolean))];
  console.log('Project IDs:', projectIds);
  
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, overall_progress')
      .in('id', projectIds);
    console.log('Projects:', projects);
  }
}

debug();
