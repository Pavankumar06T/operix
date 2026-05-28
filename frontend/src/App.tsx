import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from './store/authStore'
import ManagerLayout from './components/layout/ManagerLayout'
import EmployeeLayout from './components/layout/EmployeeLayout'
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { ResetPassword } from './pages/auth/ResetPassword'
import { Register } from './pages/auth/Register'
import { ManagerDashboard } from './pages/manager/Dashboard'
import { Projects } from './pages/manager/Projects'
import { ProjectDetail } from './pages/manager/ProjectDetail'
import { Tasks } from './pages/manager/Tasks'
import { Team } from './pages/manager/Team'
import { TimeTracking } from './pages/manager/TimeTracking'
import { AiAssistant } from './pages/manager/AiAssistant'
import { Reports } from './pages/manager/Reports'
import { Settings } from './pages/manager/Settings'
import { Alerts } from './pages/manager/Alerts'
import { EmployeeDashboard } from './pages/employee/Dashboard'
import { EmployeeProjects } from './pages/employee/Projects'
import { ClientDashboard } from './pages/client/Dashboard'

// Redirect to static landing page
const LandingRedirect = () => {
  window.location.href = '/landing.html'
  return null
}

// Basic Protected Route Wrapper
const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard if unauthorized
    if (user.role === 'manager' && user.department === 'HR') return <Navigate to="/hr" replace />
    if (user.role === 'manager') return <Navigate to="/manager" replace />
    if (user.role === 'employee') return <Navigate to="/employee" replace />
    if (user.role === 'client') return <Navigate to="/client" replace />
  }

  return <Outlet />
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 mins
        retry: 1,
      },
    },
  }))

  useEffect(() => {
    const prefs = localStorage.getItem('operix-prefs')
    if (prefs) {
      try {
        const p = JSON.parse(prefs)
        document.documentElement.classList.toggle('dark', p.theme !== 'light')
        if (p.accent) {
          document.documentElement.style.setProperty('--primary', p.accent)
        }
      } catch (e) {}
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />

          {/* Manager Routes */}
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="team" element={<Team />} />
              <Route path="time-tracking" element={<TimeTracking />} />
              <Route path="ai" element={<AiAssistant />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="alerts" element={<Alerts />} />
            </Route>
          </Route>

          {/* HR Routes (Mirrors Manager) */}
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route path="/hr" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="team" element={<Team />} />
              <Route path="time-tracking" element={<TimeTracking />} />
              <Route path="ai" element={<AiAssistant />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="alerts" element={<Alerts />} />
            </Route>
          </Route>

          {/* Employee Routes */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route element={<EmployeeLayout />}>
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/employee/projects" element={<EmployeeProjects />} />
            </Route>
          </Route>

          {/* Client Routes */}
          <Route element={<ProtectedRoute allowedRoles={['client']} />}>
            <Route path="/client" element={<ClientDashboard />} />
          </Route>

          {/* Fallback Route */}
          <Route path="/" element={<LandingRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
