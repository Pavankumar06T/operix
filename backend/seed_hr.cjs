require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seedHr() {
  const password_hash = await bcrypt.hash('password123', 10);
  const { data, error } = await supabase.from('users').insert({
    email: 'hr@kaisenspark.com',
    password_hash,
    name: 'Sarah (HR Manager)',
    role: 'manager',
    department: 'HR',
    is_active: true
  }).select().single();
  
  if (error) {
    console.error('Error seeding HR user:', error.message);
  } else {
    console.log('Successfully seeded HR user:', data);
  }
}

seedHr();
