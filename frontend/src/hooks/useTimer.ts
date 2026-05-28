import { useEffect } from 'react'
import { useTimerStore } from '../store/timerStore'
import { api } from '../lib/api'

export function useTimer() {
  const store = useTimerStore()

  useEffect(() => {
    // Attempt to restore timer from backend on mount
    const checkActiveTimer = async () => {
      try {
        const res = await api.get('/tracking/active-timer')
        if (res.data.success && res.data.data.active) {
          store.restoreTimer(res.data.data)
        } else if (store.isActive && !res.data.data.active) {
          // Sync issue: frontend thinks it's active but backend says no
          store.stopTimer()
        }
      } catch (error) {
        console.error('Failed to restore active timer', error)
      }
    }

    checkActiveTimer()
  }, []) // Empty dependency array -> runs once on mount

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (store.isActive) {
      interval = setInterval(() => {
        store.tick()
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [store.isActive, store.tick])

  return {
    isActive: store.isActive,
    timeLogId: store.timeLogId,
    taskId: store.taskId,
    taskTitle: store.taskTitle,
    projectId: store.projectId,
    elapsedSeconds: store.elapsedSeconds,
    formattedTime: store.getFormattedTime(),
    startTimer: store.startTimer,
    stopTimer: store.stopTimer
  }
}
