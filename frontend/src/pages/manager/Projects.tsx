import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, FolderKanban, Clock, MoreVertical, AlertTriangle } from 'lucide-react'

import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

const fetchProjects = async (status: string, search: string) => {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.append('status', status)
  if (search) params.append('search', search)
  
  const res = await api.get(`/projects?${params.toString()}`)
  return res.data.data
}

export function Projects() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const setSearch = (val: string) => {
    if (val) {
      searchParams.set('search', val)
    } else {
      searchParams.delete('search')
    }
    setSearchParams(searchParams)
  }
  const [isCreating, setIsCreating] = useState(false)
  
  // Create Project Form State
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects', statusFilter, search],
    queryFn: () => fetchProjects(statusFilter, search),
  })

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const payload: any = { 
        name: newName, 
        description: newDesc, 
        status: 'planning', 
        priority: 'medium' 
      }
      if (newBudget) payload.budget = Number(newBudget)
      if (newEndDate) payload.end_date = new Date(newEndDate).toISOString()

      const res = await api.post('/projects', payload)
      if (res.data.success) {
        toast({ title: 'Project created successfully' })
        setNewName('')
        setNewDesc('')
        setNewBudget('')
        setNewEndDate('')
        refetch()
        // Close sheet (handled implicitly or by resetting state in a real impl, but here we just rely on refetch)
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to create project', description: err.response?.data?.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to archive/delete this project?')) return
    
    try {
      await api.delete(`/projects/${id}`)
      toast({ title: 'Project archived successfully' })
      refetch()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to archive project', description: err.response?.data?.message || 'Error occurred.' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30'
      case 'planning': return 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
      case 'completed': return 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
      case 'on_hold': return 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all your active projects.</p>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </SheetTrigger>
          <SheetContent className="border-border sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Create Project</SheetTitle>
              <SheetDescription>Add a new project to your workspace.</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleCreateProject} className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input id="budget" type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="e.g. 150000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input id="deadline" type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Project'}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            className="pl-9 bg-muted/50 border-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-transparent">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[250px] bg-muted/20 animate-pulse rounded-xl border border-border"></div>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold">No projects found</h3>
          <p className="text-muted-foreground mt-2">Create a new project to get started or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="group hover:shadow-md transition-all border-border bg-card flex flex-col cursor-pointer" onClick={() => navigate(`/manager/projects/${project.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {project.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/manager/projects/${project.id}`) }}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e: React.MouseEvent) => handleDeleteProject(project.id, e)} className="text-destructive focus:text-destructive">Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatusColor(project.status)} variant="secondary">
                    {project.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {project.priority === 'high' && (
                    <Badge variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive/30">HIGH PRIORITY</Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pb-4 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6">
                  {project.description || 'No description provided.'}
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Overall Progress</span>
                      <span className="text-muted-foreground">{project.overall_progress || 0}%</span>
                    </div>
                    <Progress value={project.overall_progress || 0} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Tasks</span>
                      <span className="text-sm font-semibold">{project.completed_tasks || 0} / {project.total_tasks || 0}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">At Risk</span>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${project.at_risk_tasks > 0 ? 'text-destructive' : ''}`}>
                        {project.at_risk_tasks > 0 && <AlertTriangle className="w-3 h-3" />}
                        {project.at_risk_tasks || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="border-t border-border bg-muted/10 py-3 px-6 flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{project.days_remaining !== null ? `${project.days_remaining} days left` : 'No deadline'}</span>
                </div>
                <div className="flex -space-x-2">
                  {project.team_members?.slice(0, 3).map((m: any, i: number) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary" title={m.name}>
                      {m.name.substring(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {project.team_members?.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold">
                      +{project.team_members.length - 3}
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
