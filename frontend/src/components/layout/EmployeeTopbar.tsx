import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { TimerWidget } from '../tracking/TimerWidget'

export function EmployeeTopbar() {
  const { user } = useAuthStore()
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname.split('/').pop()
    if (!path || path === 'employee') return 'Dashboard'
    if (path === 'projects') return 'Projects'
    return path.charAt(0).toUpperCase() + path.slice(1)
  }

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-xl font-bold tracking-tight">{getPageTitle()}</h2>

      <div className="flex items-center gap-4">
        {/* Important: Timer Widget available on all employee pages */}
        <TimerWidget />
        
        <div className="hidden sm:flex items-center gap-2 border-l border-border pl-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm text-primary">
            {user?.name?.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{user?.name}</span>
        </div>
      </div>
    </header>
  )
}
