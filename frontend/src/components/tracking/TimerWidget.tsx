import { Clock, Square } from 'lucide-react'
import { useTimer } from '../../hooks/useTimer'
import { useState } from 'react'
import { StopTimerModal } from './StopTimerModal'

export function TimerWidget() {
  const { isActive, formattedTime, taskTitle, timeLogId } = useTimer()
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)

  if (!isActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#16161F] border border-[#2A2A3A] rounded-lg">
        <Clock className="w-4 h-4 text-[#5A5A72]" />
        <span className="text-xs text-[#5A5A72]">No active timer</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="font-mono text-sm font-medium text-green-500 w-20 text-center">
          {formattedTime}
        </span>
        <span className="text-[11px] text-[#9898B0] truncate max-w-[120px]" title={taskTitle || ''}>
          {taskTitle || 'Tracking...'}
        </span>
        <button
          onClick={() => setIsStopModalOpen(true)}
          className="flex items-center justify-center w-6 h-6 ml-1 transition-colors bg-red-500 rounded hover:bg-red-600 group"
          title="Stop Timer"
        >
          <Square className="w-3 h-3 text-white fill-white" />
        </button>
      </div>

      <StopTimerModal 
        isOpen={isStopModalOpen} 
        onClose={() => setIsStopModalOpen(false)} 
        timeLogId={timeLogId!}
        formattedTime={formattedTime}
        taskTitle={taskTitle || 'Unknown Task'}
      />
    </>
  )
}
