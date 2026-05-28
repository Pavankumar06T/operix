import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useSocketStore } from '../../store/socketStore'
import { useAlertStore } from '../../store/alertStore'

export default function ManagerLayout() {
  const { connect, disconnect } = useSocketStore()
  const { fetchAlerts, fetchUnreadCount } = useAlertStore()

  useEffect(() => {
    connect()
    fetchAlerts()
    fetchUnreadCount()

    return () => {
      disconnect()
    }
  }, [connect, disconnect, fetchAlerts, fetchUnreadCount])

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
