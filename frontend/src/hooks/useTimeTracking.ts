import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useTimerStore } from '../store/timerStore'
import { useAuthStore } from '../store/authStore'
import { useToast } from './use-toast'

export function useTimeTracking() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const store = useTimerStore()
  const { user } = useAuthStore()

  const { data: todaySummary, isLoading: isLoadingToday } = useQuery({
    queryKey: ['tracking', 'today', user?.id],
    queryFn: async () => {
      const res = await api.get('/tracking/today')
      return res.data.data
    }
  })

  const { data: teamOverview, isLoading: isLoadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ['tracking', 'team-overview', user?.id],
    queryFn: async () => {
      const res = await api.get('/tracking/team-overview')
      return res.data.data
    }
  })

  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskTitle, projectId }: { taskId: string, taskTitle: string, projectId?: string }) => {
      const res = await api.post('/tracking/task/start', { taskId, projectId })
      return { ...res.data.data, taskId, taskTitle, projectId }
    },
    onSuccess: (data) => {
      store.startTimer(data.timeLogId, data.taskId, data.taskTitle, data.projectId || null, data.startTime)
      queryClient.invalidateQueries({ queryKey: ['tracking', 'today', user?.id] })
      toast({ title: 'Timer started', description: `Tracking time for ${data.taskTitle}` })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to start timer' })
    }
  })

  const stopTaskMutation = useMutation({
    mutationFn: async ({ timeLogId, technologies, notes }: { timeLogId: string, technologies: string[], notes?: string }) => {
      const res = await api.post('/tracking/task/stop', { timeLogId, technologies, notes })
      return res.data.data
    },
    onSuccess: (data) => {
      store.stopTimer()
      queryClient.invalidateQueries({ queryKey: ['tracking', 'today', user?.id] })
      const techStr = data.technologies.length > 0 ? ` on ${data.technologies.join(', ')}` : ''
      toast({ title: 'Session logged', description: `Logged ${data.durationMins}m${techStr}` })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to stop timer' })
    }
  })

  const manualLogMutation = useMutation({
    mutationFn: async (data: { taskId: string, projectId?: string, startTime: string, endTime: string, technologies: string[], notes?: string }) => {
      const res = await api.post('/tracking/manual-log', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking', 'today', user?.id] })
      toast({ title: 'Time logged manually' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log time' })
    }
  })

  const fetchEmployeeTime = async (userId: string) => {
    const res = await api.get(`/tracking/weekly/${userId}`)
    return res.data.data
  }

  const fetchTechnologies = async (userId: string, period: string = 'week') => {
    const res = await api.get(`/tracking/technologies/${userId}?period=${period}`)
    return res.data.data
  }

  return {
    todaySummary,
    isLoadingToday,
    teamOverview,
    isLoadingTeam,
    refetchTeamOverview: refetchTeam,
    startTask: startTaskMutation.mutateAsync,
    isStarting: startTaskMutation.isPending,
    stopTask: stopTaskMutation.mutateAsync,
    isStopping: stopTaskMutation.isPending,
    manualLog: manualLogMutation.mutateAsync,
    fetchEmployeeTime,
    fetchTechnologies
  }
}
