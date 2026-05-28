import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bot,
  FileText,
  Settings,
  LogOut,
  Bell,
  Clock
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useAlertStore } from '../../store/alertStore'

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const { unreadCount } = useAlertStore()

  const basePath = user?.department === 'HR' ? '/hr' : '/manager'

  const links = [
    { name: 'Dashboard', path: basePath, icon: LayoutDashboard },
    { name: 'Projects', path: `${basePath}/projects`, icon: FolderKanban },
    { name: 'Tasks', path: `${basePath}/tasks`, icon: CheckSquare },
    { name: 'Team', path: `${basePath}/team`, icon: Users },
    { name: 'Time Tracking', path: `${basePath}/time-tracking`, icon: Clock },
    { name: 'AI Assistant', path: `${basePath}/ai`, icon: Bot },
    { name: 'Reports', path: `${basePath}/reports`, icon: FileText },
    { name: 'Settings', path: `${basePath}/settings`, icon: Settings },
  ]

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
          <img src="/logo.png" alt="Operix Logo" className="w-10 h-10 object-cover rounded-xl" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          OPERIX
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Predict. Prevent. Perform.</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.path
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

        <Link
          to={`${basePath}/alerts`}
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === `${basePath}/alerts`
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            Alerts
          </div>
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold border border-border">
            {user?.name?.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.department === 'HR' ? 'Human Resources' : user?.role}</p>
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
