import { useState } from 'react'
import { Button } from '../ui/button'
import { useTimeTracking } from '../../hooks/useTimeTracking'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

const TECH_OPTIONS = [
  ['React.js', 'Node.js', 'TypeScript', 'Python'],
  ['PostgreSQL', 'MongoDB', 'AWS', 'Docker'],
  ['Figma', 'GraphQL', 'Redis', 'Kubernetes'],
  ['TailwindCSS', 'Express', 'FastAPI', 'MySQL']
]

export function StopTimerModal({ 
  isOpen, 
  onClose, 
  timeLogId, 
  formattedTime, 
  taskTitle 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  timeLogId: string, 
  formattedTime: string, 
  taskTitle: string 
}) {
  const [selectedTechs, setSelectedTechs] = useState<string[]>([])
  const [customTech, setCustomTech] = useState('')
  const [notes, setNotes] = useState('')
  const { stopTask, isStopping } = useTimeTracking()

  const toggleTech = (tech: string) => {
    setSelectedTechs(prev => 
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    )
  }

  const handleAddCustom = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTech.trim()) {
      e.preventDefault()
      if (!selectedTechs.includes(customTech.trim())) {
        setSelectedTechs([...selectedTechs, customTech.trim()])
      }
      setCustomTech('')
    }
  }

  const handleSave = async () => {
    if (!timeLogId) return
    await stopTask({ timeLogId, technologies: selectedTechs, notes })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] bg-[#16161F] border-[#2A2A3A] p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-white">Log Your Work Session</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <div className="text-4xl font-mono font-bold text-[#22C55E] mb-1">
            {formattedTime}
          </div>
          <div className="text-sm font-medium text-center text-muted-foreground">
            {taskTitle}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#F8F8FF] mb-3 block">What technologies did you use?</label>
            <div className="flex flex-col gap-2">
              {TECH_OPTIONS.map((row, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  {row.map(tech => (
                    <button
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-colors border ${
                        selectedTechs.includes(tech)
                          ? 'bg-[#4F6EF7]/20 border-[#4F6EF7] text-[#4F6EF7] font-medium'
                          : 'bg-[#1C1C28] border-[#2A2A3A] text-[#9898B0] hover:text-white'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              ))}
              
              {/* Custom tags rendered below predefined */}
              {selectedTechs.filter(t => !TECH_OPTIONS.flat().includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTechs.filter(t => !TECH_OPTIONS.flat().includes(t)).map(tech => (
                    <button
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#A855F7]/20 border border-[#A855F7] text-[#A855F7]"
                    >
                      {tech} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Add custom tech and press Enter..."
              value={customTech}
              onChange={e => setCustomTech(e.target.value)}
              onKeyDown={handleAddCustom}
              className="w-full mt-3 px-3 py-2 text-sm bg-[#1C1C28] border border-[#2A2A3A] rounded-lg text-white placeholder-[#5A5A72] focus:outline-none focus:border-[#4F6EF7]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#F8F8FF] mb-2 block">Session Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What did you accomplish?"
              rows={3}
              className="w-full px-3 py-2 text-sm bg-[#1C1C28] border border-[#2A2A3A] rounded-lg text-white placeholder-[#5A5A72] focus:outline-none focus:border-[#4F6EF7] resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#2A2A3A]">
          <div className="text-sm text-[#9898B0]">
            Duration: <span className="font-mono text-white">{formattedTime}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-[#9898B0] hover:text-white hover:bg-white/5">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isStopping}
              className="bg-gradient-to-r from-[#4F6EF7] to-[#A855F7] text-white font-medium border-0 hover:opacity-90 transition-opacity"
            >
              {isStopping ? 'Saving...' : 'Save & Stop Timer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
