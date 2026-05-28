import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Bell, FolderKanban, CheckSquare, Loader2 } from 'lucide-react'
import { Input } from '../ui/input'
import { useAlertStore } from '../../store/alertStore'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { unreadCount } = useAlertStore()
  const { user } = useAuthStore()
  
  const basePath = user?.department === 'HR' ? '/hr' : '/manager'
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<{ projects: any[], tasks: any[] }>({ projects: [], tasks: [] })
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults({ projects: [], tasks: [] })
      return
    }

    const fetchResults = async () => {
      setIsSearching(true)
      try {
        const [projectsRes, tasksRes] = await Promise.all([
          api.get(`/projects?search=${encodeURIComponent(searchQuery)}&limit=5`),
          api.get(`/tasks?search=${encodeURIComponent(searchQuery)}&limit=5`)
        ])
        setResults({
          projects: projectsRes.data.data || [],
          tasks: tasksRes.data.data || []
        })
      } catch (err) {
        console.error('Search failed', err)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(fetchResults, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery) {
      setShowDropdown(false)
      navigate(`${basePath}/projects?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const getPageTitle = () => {
    const path = location.pathname.split('/').pop()
    if (!path || path === 'manager' || path === 'hr') return 'Dashboard'
    if (path === 'ai') return 'AI Assistant'
    return path.charAt(0).toUpperCase() + path.slice(1)
  }

  const hasResults = results.projects.length > 0 || results.tasks.length > 0

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-xl font-semibold tracking-tight">{getPageTitle()}</h2>

      <div className="flex items-center gap-4">
        <div className="relative w-72 hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search projects, tasks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => { if (searchQuery.length >= 2) setShowDropdown(true) }}
              className="w-full pl-9 bg-muted/50 border-transparent focus-visible:border-primary"
            />
          </form>

          {showDropdown && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[400px]">
              {isSearching ? (
                <div className="p-4 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : hasResults ? (
                <div className="overflow-y-auto py-2">
                  {results.projects.length > 0 && (
                    <div className="px-2">
                      <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</h3>
                      {results.projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setShowDropdown(false)
                            navigate(`${basePath}/projects/${p.id}`)
                          }}
                          className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded-md flex items-center gap-2"
                        >
                          <FolderKanban className="w-4 h-4 text-blue-500" />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.tasks.length > 0 && (
                    <div className="px-2 mt-2">
                      <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</h3>
                      {results.tasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setShowDropdown(false)
                            navigate(`${basePath}/tasks?search=${encodeURIComponent(t.title)}`)
                          }}
                          className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded-md flex items-center gap-2"
                        >
                          <CheckSquare className="w-4 h-4 text-green-500" />
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          onClick={() => navigate(`${basePath}/alerts`)}
          className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border border-card" />
          )}
        </button>
      </div>
    </header>
  )
}
