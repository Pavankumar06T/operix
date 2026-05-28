require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function assign() {
  const { data: ravi } = await supabase.from('users').select('id').eq('email', 'ravi@kaisenspark.com').single();
  const { data: projects } = await supabase.from('projects').select('id').limit(1);
  
  if (ravi && projects && projects.length > 0) {
    const projectId = projects[0].id;
    
    // Check if task already exists
    const { data: existing } = await supabase.from('tasks').select('id').eq('assigned_to', ravi.id).eq('status', 'in_progress');
    if (existing && existing.length > 0) {
      console.log('Ravi already has tasks.');
      return;
    }

    const { data, error } = await supabase.from('tasks').insert({
      title: 'Build Time Tracking Frontend',
      description: 'Implement the TimerWidget and StopTimerModal in the employee dashboard.',
      status: 'in_progress',
      priority: 'high',
      project_id: projectId,
      assigned_to: ravi.id,
      deadline: new Date(Date.now() + 86400000).toISOString()
    }).select();

    console.log('Assigned task:', { data, error });
  } else {
    console.log('Could not find Ravi or a project');
  }
}
assign();
