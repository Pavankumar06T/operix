import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TimerState {
  isActive: boolean
  timeLogId: string | null
  taskId: string | null
  taskTitle: string | null
  projectId: string | null
  startTime: string | null // ISO string
  elapsedSeconds: number
  technologies: string[]
  
  startTimer: (timeLogId: string, taskId: string, taskTitle: string, projectId: string | null, startTime: string) => void
  stopTimer: () => void
  restoreTimer: (data: { timeLogId: string, taskId: string, taskTitle: string, projectId: string | null, startTime: string, elapsedMins: number }) => void
  tick: () => void
  getFormattedTime: () => string
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isActive: false,
      timeLogId: null,
      taskId: null,
      taskTitle: null,
      projectId: null,
      startTime: null,
      elapsedSeconds: 0,
      technologies: [],

      startTimer: (timeLogId, taskId, taskTitle, projectId, startTime) => {
        set({
          isActive: true,
          timeLogId,
          taskId,
          taskTitle,
          projectId,
          startTime,
          elapsedSeconds: 0,
          technologies: []
        })
      },

      stopTimer: () => {
        set({
          isActive: false,
          timeLogId: null,
          taskId: null,
          taskTitle: null,
          projectId: null,
          startTime: null,
          elapsedSeconds: 0,
          technologies: []
        })
      },

      restoreTimer: (data) => {
        // Calculate exact elapsed seconds based on startTime to overcome sleep/refresh drift
        const start = new Date(data.startTime)
        const now = new Date()
        const diffSeconds = Math.floor((now.getTime() - start.getTime()) / 1000)
        
        set({
          isActive: true,
          timeLogId: data.timeLogId,
          taskId: data.taskId,
          taskTitle: data.taskTitle,
          projectId: data.projectId,
          startTime: data.startTime,
          elapsedSeconds: diffSeconds,
        })
      },

      tick: () => {
        const { isActive, startTime } = get()
        if (isActive && startTime) {
          // Re-calculate drift to be highly accurate instead of naive +1
          const start = new Date(startTime)
          const now = new Date()
          const diffSeconds = Math.floor((now.getTime() - start.getTime()) / 1000)
          set({ elapsedSeconds: diffSeconds })
        }
      },

      getFormattedTime: () => {
        const { elapsedSeconds } = get()
        const h = Math.floor(elapsedSeconds / 3600)
        const m = Math.floor((elapsedSeconds % 3600) / 60)
        const s = elapsedSeconds % 60

        const pad = (num: number) => num.toString().padStart(2, '0')
        return `${pad(h)}:${pad(m)}:${pad(s)}`
      }
    }),
    {
      name: 'operix-timer-storage',
      // We only persist these fields
      partialize: (state) => ({
        isActive: state.isActive,
        timeLogId: state.timeLogId,
        taskId: state.taskId,
        taskTitle: state.taskTitle,
        projectId: state.projectId,
        startTime: state.startTime,
      })
    }
  )
)
