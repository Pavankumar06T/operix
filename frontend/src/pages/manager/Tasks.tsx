import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DropResult } from '@hello-pangea/dnd'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { LayoutList, LayoutGrid, AlertTriangle, Clock } from 'lucide-react'
import { format } from 'date-fns'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const fetchTasks = async () => {
  const res = await api.get('/tasks')
  return res.data.data
}

const updateTaskStatus = async ({ id, status }: { id: string, status: string }) => {
  const res = await api.put(`/tasks/${id}`, { status })
  return res.data
}

export function Tasks() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [search, setSearch] = useState('')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  })

  const mutation = useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    
    const taskId = result.draggableId
    const newStatus = result.destination.droppableId
    const sourceStatus = result.source.droppableId

    if (newStatus !== sourceStatus) {
      mutation.mutate({ id: taskId, status: newStatus })
      
      // Optimistic update
      queryClient.setQueryData(['tasks'], (old: any) => {
        return old.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t)
      })
    }
  }

  const columns = [
    { id: 'not_started', title: 'To Do', color: 'border-slate-500' },
    { id: 'in_progress', title: 'In Progress', color: 'border-blue-500' },
    { id: 'delayed', title: 'Delayed', color: 'border-destructive' },
    { id: 'completed', title: 'Done', color: 'border-green-500' },
  ]

  const filteredTasks = tasks.filter((t: any) => t.title.toLowerCase().includes(search.toLowerCase()))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage project tasks and track progress.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search tasks..." 
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-[250px] bg-card"
          />
          <div className="flex items-center bg-card rounded-md border border-border p-1">
            <Button variant={view === 'board' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('board')} className="h-8">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Board
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')} className="h-8">
              <LayoutList className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </div>

      {view === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden">
            {columns.map(col => (
              <div key={col.id} className="flex flex-col bg-muted/30 rounded-xl p-4 border border-border overflow-hidden">
                <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${col.color}`}>
                  <h3 className="font-semibold">{col.title}</h3>
                  <Badge variant="secondary" className="bg-background">{filteredTasks.filter((t: any) => t.status === col.id).length}</Badge>
                </div>
                
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className={`flex-1 overflow-y-auto space-y-3 min-h-[150px] transition-colors rounded-lg p-1 ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                    >
                      {filteredTasks.filter((t: any) => t.status === col.id).map((task: any, index: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <Card 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border-border shadow-sm cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg border-primary/50' : 'hover:border-primary/30'}`}
                            >
                              <CardHeader className="p-4 pb-2 space-y-1">
                                <p className="font-medium text-sm leading-tight">{task.title}</p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {task.priority === 'high' && <Badge variant="destructive" className="text-[10px] py-0 h-4">High</Badge>}
                                  {task.risk_score >= 70 && (
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-destructive text-destructive bg-destructive/10">
                                      {task.risk_score}% Risk
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-2 text-xs text-muted-foreground flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {format(new Date(task.deadline), 'MMM dd')}
                                </div>
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px] text-primary" title={task.assigned_user?.name}>
                                  {task.assigned_user?.name?.substring(0, 2).toUpperCase() || '??'}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
            <div className="col-span-5">Task</div>
            <div className="col-span-2">Assignee</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Risk</div>
            <div className="col-span-2">Deadline</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredTasks.map((task: any) => (
              <div key={task.id} className="grid grid-cols-12 gap-4 items-center p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer text-sm">
                <div className="col-span-5 font-medium">{task.title}</div>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px] text-primary">
                    {task.assigned_user?.name?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <span className="truncate">{task.assigned_user?.name || 'Unassigned'}</span>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
                </div>
                <div className="col-span-1">
                  {task.risk_score >= 70 ? (
                    <span className="text-destructive font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {task.risk_score}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{task.risk_score}%</span>
                  )}
                </div>
                <div className="col-span-2 text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(task.deadline), 'MMM dd, yyyy')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
