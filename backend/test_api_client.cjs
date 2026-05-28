const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: user } = await supabase.from('users').select('*').eq('email', 'nexus@kaisenspark.com').single();
  
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const res = await fetch('http://localhost:5000/api/clients/me/portal', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const json = await res.json();
  console.log('API Response:', JSON.stringify(json, null, 2));
}

run();
