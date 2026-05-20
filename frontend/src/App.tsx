import { Component, Suspense, lazy, type ReactNode } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bot,
  FileText,
  Settings,
  Search,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import Dashboard from './pages/manager/Dashboard';
import { useAuthStore } from './stores/authStore';
import { getInitials, getAvatarColor } from './lib/utils';

// Lazy-load AI Assistant to isolate any import errors
const AIAssistant = lazy(() => import('./pages/manager/AIAssistant'));

interface SidebarItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  isPurple?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/team', label: 'Team', icon: Users },
  { path: '/ai-assistant', label: 'AI Assistant', icon: Bot, isPurple: true },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

// Error Boundary to catch crashes without redirecting
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-red-950 border border-red-900 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-[#F8F8FF] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#9898B0] mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-[#4F6EF7] hover:bg-[#3D5AE5] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#9898B0]">Loading...</p>
      </div>
    </div>
  );
}

function ManagerLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const userName = user?.name || 'Manager';
  const isAIPage = location.pathname === '/ai-assistant';

  return (
    <div className="flex h-screen bg-[#0A0A0F] overflow-hidden">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-[240px] bg-[#111118] border-r border-[#2A2A3A] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#2A2A3A]">
          <div className="flex items-center gap-2.5">
            <img
              src="/operix-logo.jpg"
              alt="Operix"
              className="w-9 h-9 rounded-lg object-contain"
            />
            <div className="flex flex-col">
              <span className="text-[#F8F8FF] font-bold text-sm tracking-tight">Operix</span>
              <span className="text-[9px] text-[#5A5A72] tracking-wide">Predict. Prevent. Perform.</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? item.isPurple
                        ? 'bg-purple-600/15 text-purple-400'
                        : 'bg-[#1C1C28] text-[#F8F8FF]'
                      : 'text-[#9898B0] hover:text-[#F8F8FF] hover:bg-[#16161F]'
                  }`
                }
              >
                <Icon
                  size={18}
                  className={`flex-shrink-0 ${item.isPurple ? 'group-[.active]:text-purple-400' : ''}`}
                />
                {item.label}
                {item.isPurple && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom user section */}
        <div className="p-3 border-t border-[#2A2A3A]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#16161F] transition-colors cursor-pointer">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: getAvatarColor(userName) }}
            >
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F8F8FF] truncate">{userName}</p>
              <p className="text-[10px] text-[#5A5A72]">Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-[#111118] border-b border-[#2A2A3A] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Search size={16} className="text-[#5A5A72]" />
            <input
              type="text"
              placeholder="Search projects, tasks, team..."
              className="bg-transparent border-none outline-none text-sm text-[#F8F8FF] placeholder:text-[#5A5A72] w-full"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-[#1C1C28] transition-colors">
              <Bell size={18} className="text-[#9898B0]" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444]" />
            </button>

            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer"
              style={{ backgroundColor: getAvatarColor(userName) }}
            >
              {getInitials(userName)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto ${isAIPage ? '' : ''}`}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ManagerLayout>
            <Dashboard />
          </ManagerLayout>
        }
      />
      <Route
        path="/ai-assistant"
        element={
          <ManagerLayout>
            <Suspense fallback={<PageLoader />}>
              <AIAssistant />
            </Suspense>
          </ManagerLayout>
        }
      />
      {/* Placeholder routes for other pages */}
      <Route
        path="/projects"
        element={
          <ManagerLayout>
            <PlaceholderPage title="Projects" description="Project management view — built by teammate" />
          </ManagerLayout>
        }
      />
      <Route
        path="/tasks"
        element={
          <ManagerLayout>
            <PlaceholderPage title="Tasks" description="Task board view — built by teammate" />
          </ManagerLayout>
        }
      />
      <Route
        path="/team"
        element={
          <ManagerLayout>
            <PlaceholderPage title="Team" description="Team management view — built by teammate" />
          </ManagerLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <ManagerLayout>
            <PlaceholderPage title="Reports" description="AI-generated weekly reports" />
          </ManagerLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ManagerLayout>
            <PlaceholderPage title="Settings" description="Application settings" />
          </ManagerLayout>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[#F8F8FF]">{title}</h1>
      <p className="text-sm text-[#9898B0] mt-1">{description}</p>
      <div className="mt-8 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#16161F] border border-[#2A2A3A] flex items-center justify-center mx-auto mb-4">
            <FolderKanban size={28} className="text-[#5A5A72]" />
          </div>
          <p className="text-[#9898B0] text-sm">This section is managed by other team members</p>
        </div>
      </div>
    </div>
  );
}
