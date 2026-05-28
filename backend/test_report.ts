import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { startOfWeek, endOfWeek, subDays } from 'date-fns'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const llm = new ChatGoogleGenerativeAI({
  modelName: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2
})

async function testGenerate() {
  const managerId = 'b7e28984-7a1a-4f51-aa34-1188bb3e8585' // Dummy ID
  const { data: managers } = await supabase.from('users').select('id').eq('role', 'manager').limit(1)
  const actualManagerId = managers?.[0]?.id

  const { data, error } = await supabase
    .from('weekly_reports')
    .insert({
      user_id: actualManagerId,
      week_start: new Date().toISOString(),
      week_end: new Date().toISOString(),
      content: 'Test content'
    })
    .select()

  console.log('Error:', error)
  console.log('Data:', data)
}
testGenerate()
