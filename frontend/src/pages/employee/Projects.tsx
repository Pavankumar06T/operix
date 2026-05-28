import { useQuery } from '@tanstack/react-query'
import { Users, Activity, FolderKanban } from 'lucide-react'

import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const fetchPortalData = async () => {
  const res = await api.get('/employee/portal')
  return res.data.data
}

export function EmployeeProjects() {
  const { user } = useAuthStore()

  const { data: portalData, isLoading: isLoadingPortal } = useQuery({
    queryKey: ['employeePortal', user?.id],
    queryFn: fetchPortalData,
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Project Collaboration Hub
        </h2>
        <p className="text-muted-foreground text-lg">See the overall progress and what your team is working on.</p>
      </div>

      {isLoadingPortal ? (
        <div className="grid gap-6">
          <div className="h-64 bg-muted/50 animate-pulse rounded-xl" />
        </div>
      ) : portalData?.projects?.length > 0 ? (
        <div className="space-y-8">
          {portalData.projects.map((project: any) => (
            <Card key={project.id} className="border-border bg-card shadow-lg overflow-hidden rounded-xl">
              <div className="p-8 border-b border-border bg-muted/10 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none rounded-full" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{project.name}</h3>
                    <p className="text-muted-foreground mt-2">{project.description || 'No description provided.'}</p>
                  </div>
                  <Badge variant="outline" className={`px-3 py-1 ${project.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                    {project.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="relative z-10 space-y-3 bg-background/50 p-5 rounded-xl border border-border/50">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Overall Project Completion</span>
                    <span className="text-primary">{project.overall_progress}%</span>
                  </div>
                  <Progress value={project.overall_progress} className="h-3 bg-muted" />
                </div>
              </div>
              
              <CardContent className="p-8">
                <h4 className="text-lg font-bold flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-blue-500" /> Active Team Tasks
                </h4>
                
                {project.active_tasks?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {project.active_tasks.map((task: any) => (
                      <div key={task.id} className="flex flex-col p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors gap-4">
                        <span className="text-base font-semibold leading-tight">{task.title}</span>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-2">
                            {task.assigned_to ? (
                              <>
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/30">
                                  {task.assigned_to.initials}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">{task.assigned_to.name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Unassigned</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 w-1/3">
                            <Progress value={task.progress} className="h-2 w-full" />
                            <span className="text-xs font-bold w-8 text-right">{task.progress}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 bg-muted/20 rounded-xl border border-dashed border-border text-muted-foreground">
                    No active tasks right now.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-border rounded-xl bg-card">
          <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-bold">No Active Projects</h3>
          <p className="text-muted-foreground mt-2">You currently have no active project assignments.</p>
        </div>
      )}
    </div>
  )
}
