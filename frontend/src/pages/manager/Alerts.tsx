import { useEffect } from 'react'
import { useAlertStore } from '@/store/alertStore'
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  HeartHandshake, 
  Info 
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function Alerts() {
  const { alerts, unreadCount, fetchAlerts, markSeen, markAllSeen } = useAlertStore()

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'burnout':
        return <HeartHandshake className="w-5 h-5 text-purple-500" />
      case 'system':
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'risk': return 'border-amber-500/50 bg-amber-500/5'
      case 'burnout': return 'border-purple-500/50 bg-purple-500/5'
      case 'system': return 'border-blue-500/50 bg-blue-500/5'
      default: return 'border-border bg-card'
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts & Insights</h1>
          <p className="text-muted-foreground">
            Real-time AI predictions and system notifications.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={() => markAllSeen()}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors text-sm font-medium"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl border-border bg-card">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">You're all caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">No active alerts at the moment.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => !alert.is_seen && markSeen(alert.id)}
              className={`p-5 rounded-xl border transition-all duration-200 ${
                !alert.is_seen 
                  ? `${getAlertColor(alert.type)} cursor-pointer hover:shadow-md hover:scale-[1.01]` 
                  : 'bg-card border-border opacity-70'
              }`}
            >
              <div className="flex gap-4">
                <div className={`mt-1 flex-shrink-0 ${!alert.is_seen ? 'animate-pulse' : ''}`}>
                  {getAlertIcon(alert.type)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${!alert.is_seen ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {alert.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className={`text-sm ${!alert.is_seen ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                    {alert.message}
                  </p>

                  {alert.entity_type === 'task' && !alert.is_seen && (
                    <div className="mt-3 inline-flex items-center text-xs font-medium bg-background border px-2.5 py-1 rounded-md">
                      Action Required: Review Task
                    </div>
                  )}
                  {alert.entity_type === 'employee' && !alert.is_seen && (
                    <div className="mt-3 inline-flex items-center text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2.5 py-1 rounded-md">
                      Action Required: Check on Team Member
                    </div>
                  )}
                </div>
                
                {!alert.is_seen && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
