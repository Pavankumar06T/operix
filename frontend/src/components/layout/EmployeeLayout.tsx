import { Outlet } from 'react-router-dom'
import { EmployeeSidebar } from './EmployeeSidebar'
import { EmployeeTopbar } from './EmployeeTopbar'

export default function EmployeeLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <EmployeeSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <EmployeeTopbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-muted/20">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
