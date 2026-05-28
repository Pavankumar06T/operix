import { subDays, startOfDay, format } from 'date-fns'

const last7Days = Array.from({ length: 7 }).map((_, i) => {
  const d = subDays(new Date(), 6 - i)
  return {
    date: startOfDay(d).toISOString(),
    label: format(d, 'EEE'),
    completed: 0,
    assigned: 0
  }
})

console.log("last7Days dates:")
console.log(last7Days.map(d => d.date))

const tasksData = [
  {
    "id": "b71d3772-4038-4ee3-8f72-fdd04e4f4203",
    "status": "not_started",
    "created_at": "2026-05-24T14:03:32.109846+00:00",
    "updated_at": "2026-05-24T14:30:02.89645+00:00"
  }
]

tasksData.forEach((task: any) => {
  const createdDate = startOfDay(new Date(task.created_at)).toISOString()
  console.log('Task created_at:', task.created_at)
  console.log('Task startOfDay iso:', createdDate)
  
  const createdDay = last7Days.find(d => d.date === createdDate)
  if (createdDay) {
    createdDay.assigned++
    console.log('Matched and assigned incremented')
  } else {
    console.log('NO MATCH FOUND for assigned')
  }
})

console.log(last7Days)
