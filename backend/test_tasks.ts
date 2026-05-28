import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'e:/operix_final/backend/.env' })

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

async function test() {
  const { data: users } = await supabase.from('users').select('*').eq('role', 'manager').limit(1)
  if (!users || users.length === 0) return console.log('No managers found')
  const managerId = users[0].id

  const { data: projects } = await supabase.from('projects').select('id').eq('manager_id', managerId)
  const projectIds = projects?.map(p => p.id) || []

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id, status, created_at, updated_at, assigned_to,
      users!tasks_assigned_to_fkey (id, name)
    `)
    .in('project_id', projectIds)

  console.log('Error:', error)
  console.log(JSON.stringify(tasks, null, 2))
}

test()
