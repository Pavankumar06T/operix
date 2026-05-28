const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: user } = await supabase.from('users').select('*').eq('email', 'ravi@kaisenspark.com').single();
  console.log('User ID:', user.id);
  
  const { data: tasks } = await supabase.from('tasks').select('id, title, assigned_to, status');
  const assigned = tasks.filter(t => t.assigned_to === user.id);
  
  console.log('Total Tasks in DB:', tasks.length);
  console.log('Tasks assigned to Ravi:', assigned);
}

run();
