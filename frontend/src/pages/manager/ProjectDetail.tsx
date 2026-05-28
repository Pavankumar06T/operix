import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, AlertTriangle, Target, Activity, Bot, Plus, Loader2, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  assigned_to: z.string().optional(),
  estimated_hours: z.string().min(1, 'Required'),
  deadline: z.string().min(1, 'Deadline is required')
})

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)

  const [isAddingMember, setIsAddingMember] = useState(false)
  
  // Task Editing State
  const [editingTask, setEditingTask] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`)
      return res.data.data
    },
  })

  const { data: globalTeam } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await api.get('/team')
      return res.data.data
    },
  })

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium' }
  })

  const handleGenerateAI = async () => {
    if (!project?.description) {
      toast({ variant: 'destructive', title: 'Description missing', description: 'Add a project description to generate tasks.' })
      return
    }
    setIsAiLoading(true)
    try {
      await api.post('/ai/breakdown', { projectId: id, description: project.description })
      toast({ title: 'AI Tasks Generated', description: 'Tasks successfully generated and assigned.' })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.error || 'Failed to generate tasks.' })
    } finally {
      setIsAiLoading(false)
    }
  }

  const onCreateTask = async (data: z.infer<typeof taskSchema>) => {
    setIsCreatingTask(true)
    try {
      await api.post('/tasks', {
        project_id: id,
        ...data,
        estimated_hours: parseInt(data.estimated_hours) || 0
      })
      toast({ title: 'Success', description: 'Task created successfully.' })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      setIsTaskDialogOpen(false)
      reset()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.error || 'Failed to create task.' })
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    setIsAddingMember(true)
    try {
      await api.post(`/projects/${id}/members`, { userId })
      toast({ title: 'Success', description: 'Member added to project!' })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.error || 'Failed to add member.' })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingTask(true)
    try {
      await api.put(`/tasks/${editingTask.id}`, {
        status: editingTask.status,
        priority: editingTask.priority,
        assigned_to: typeof editingTask.assigned_to === 'object' && editingTask.assigned_to !== null 
          ? editingTask.assigned_to.id 
          : editingTask.assigned_to,
        estimated_hours: editingTask.estimated_hours
      })
      toast({ title: 'Success', description: 'Task updated successfully!' })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      setIsEditDialogOpen(false)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to update task.' })
    } finally {
      setIsUpdatingTask(false)
    }
  }

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Calculate KPIs
  const totalTasks = project?.tasks?.length || 0
  const completedTasks = project?.tasks?.filter((t: any) => t.status === 'completed').length || 0
  const overallProgress = totalTasks > 0 ? Math.round(project.tasks.reduce((acc: number, t: any) => acc + (t.progress || 0), 0) / totalTasks) : 0
  const atRiskTasks = project?.tasks?.filter((t: any) => (t.risk_score || 0) >= 70).length || 0
  
  let daysRemaining: number | string = '∞'
  if (project?.end_date) {
    const diff = new Date(project.end_date).getTime() - new Date().getTime()
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/manager/projects')} className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="outline" className="text-xs">{project.status.toUpperCase()}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 max-w-2xl">{project.description || 'No description provided.'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateAI} disabled={isAiLoading}>
            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4 text-primary" />}
            AI Breakdown
          </Button>
          <Button onClick={() => setIsTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-3xl font-bold">{overallProgress}%</div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <div className="text-3xl font-bold">{completedTasks} <span className="text-muted-foreground text-lg font-normal">/ {totalTasks}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">At Risk</p>
              <AlertTriangle className={`h-4 w-4 ${atRiskTasks > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <div className={`text-3xl font-bold ${atRiskTasks > 0 ? 'text-destructive' : ''}`}>{atRiskTasks}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Days Remaining</p>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <div className="text-3xl font-bold">{daysRemaining}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="mt-6 border border-border rounded-xl bg-card p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Project Tasks</h3>
          </div>
          
          <div className="grid gap-4">
            {project.tasks?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <Bot className="h-8 w-8 mx-auto mb-3 text-primary/50" />
                <p>No tasks found. Click "AI Breakdown" to generate them automatically!</p>
              </div>
            ) : (
              project.tasks?.map((task: any) => (
                <div 
                  key={task.id} 
                  onClick={() => {
                    setEditingTask(task)
                    setIsEditDialogOpen(true)
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/30 border border-border gap-4 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-foreground">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 capitalize text-primary font-medium">
                        <Activity className="h-3.5 w-3.5" />
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className={`capitalize font-medium ${task.priority === 'high' ? 'text-destructive' : task.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                        {task.priority} Priority
                      </span>
                      {task.deadline && (
                        <span className="flex items-center text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {task.assigned_to ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary text-xs">
                          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold">
                            {task.assigned_to.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{task.assigned_to.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-48 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{task.progress || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${task.progress || 0}%` }} />
                    </div>
                    {task.risk_score > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Risk: <span className={task.risk_score >= 70 ? 'text-red-500 font-bold' : task.risk_score >= 40 ? 'text-yellow-500' : ''}>{task.risk_score}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6 border border-border rounded-xl bg-card p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Project Team</h3>
            
            <Select onValueChange={handleAddMember} disabled={isAddingMember}>
              <SelectTrigger className="w-[200px]">
                <UserPlus className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Add Member" />
              </SelectTrigger>
              <SelectContent>
                {globalTeam?.filter((member: any) => 
                  !project.team_members?.some((pm: any) => pm.id === member.id)
                ).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
                {globalTeam?.filter((member: any) => 
                  !project.team_members?.some((pm: any) => pm.id === member.id)
                ).length === 0 && (
                  <SelectItem value="none" disabled>No new members available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            {project.team_members?.map((m: any) => (
              <div key={m.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {m.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.project_role || m.role}</p>
                </div>
              </div>
            ))}
            {project.team_members?.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">No team members assigned yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 border border-border rounded-xl bg-card p-6 min-h-[400px]">
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold mb-6">Project Settings</h3>
            
            <div className="space-y-6">
              <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/20">
                <h4 className="text-sm font-medium mb-2">Project Status</h4>
                <Select 
                  value={project.status} 
                  onValueChange={async (v) => {
                    try {
                      await api.put(`/projects/${id}`, { status: v })
                      queryClient.invalidateQueries({ queryKey: ['project', id] })
                      toast({ title: 'Success', description: 'Project status updated!' })
                    } catch (err) {
                      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update project status.' })
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">Updating the status will reflect across all dashboards.</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-destructive">Archive Project</p>
                    <p className="text-xs text-muted-foreground mt-1">This will permanently delete the project and all associated tasks.</p>
                  </div>
                  <Button variant="destructive" onClick={async () => {
                    if (confirm('Are you sure you want to delete this project?')) {
                      try {
                        await api.delete(`/projects/${id}`)
                        navigate('/manager/projects')
                      } catch (err: any) {
                        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete project.' })
                      }
                    }
                  }}>
                    Archive Project
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Manual Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateTask)} className="space-y-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input {...register('title')} placeholder="e.g. Set up database schema" />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={3} placeholder="Task details..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select onValueChange={(v) => setValue('priority', v as any)} defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select onValueChange={(v) => setValue('assigned_to', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.team_members?.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Est. Hours</Label>
                <Input type="number" {...register('estimated_hours')} placeholder="5" />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" {...register('deadline')} />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreatingTask}>
                {isCreatingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Detail / Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg border border-border">
              <Label className="text-muted-foreground text-xs uppercase">Description</Label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{editingTask?.description || 'No description provided.'}</p>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground capitalize">
                    {editingTask?.status?.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select 
                    value={editingTask?.assigned_to?.id || editingTask?.assigned_to || "unassigned"} 
                    onValueChange={(v) => setEditingTask({...editingTask, assigned_to: v === "unassigned" ? null : v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {project.team_members?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={editingTask?.priority} 
                    onValueChange={(v) => setEditingTask({...editingTask, priority: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Hours</Label>
                  <Input 
                    type="number" 
                    value={editingTask?.estimated_hours || 0} 
                    onChange={(e) => setEditingTask({...editingTask, estimated_hours: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-4" disabled={isUpdatingTask}>
                {isUpdatingTask ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
