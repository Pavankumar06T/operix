import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export function EmployeeSidebar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const links = [
    { name: 'Dashboard', path: '/employee', icon: LayoutDashboard },
    { name: 'Projects', path: '/employee/projects', icon: FolderKanban },
  ]

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
          <img src="/logo.png" alt="Operix Logo" className="w-10 h-10 object-cover rounded-xl" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          OPERIX
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Employee Workspace</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        {links.map((link) => {
          const Icon = link.icon
          // Handle exact match for dashboard, partial for others
          const isActive = link.path === '/employee' 
            ? location.pathname === link.path 
            : location.pathname.startsWith(link.path)
            
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold border border-border">
            {user?.name?.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
