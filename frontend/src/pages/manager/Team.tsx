import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, Flame, TrendingUp, AlertCircle, Search, Filter, IndianRupee } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'

import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const fetchTeam = async () => {
  const res = await api.get('/team')
  return res.data.data
}

const formatCTC = (amount: number | null) => {
  if (!amount) return null
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)} LPA`
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
  return `${amount}`
}

export function Team() {
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<any | null>(null)

  const { data: team = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: fetchTeam,
  })

  const getBurnoutLevel = (score: number | null) => {
    if (score === null) return 'low'
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  const teamWithLevel = team.map((m: any) => ({
    ...m,
    burnout_level: getBurnoutLevel(m.burnout_score)
  }))

  const filteredTeam = teamWithLevel.filter((m: any) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchesRisk = filterRisk === 'all' || m.burnout_level === filterRisk
    return matchesSearch && matchesRisk
  })

  const getBurnoutColor = (level: string) => {
    if (level === 'critical') return 'text-destructive bg-destructive/10 border-destructive'
    if (level === 'high') return 'text-orange-500 bg-orange-500/10 border-orange-500'
    if (level === 'medium') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500'
    return 'text-green-500 bg-green-500/10 border-green-500'
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1">Monitor capacity, efficiency, and burnout risks.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search team..." 
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9 bg-card w-full"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={filterRisk !== 'all' ? 'secondary' : 'outline'} size="icon" className="shrink-0 relative">
                <Filter className="h-4 w-4" />
                {filterRisk !== 'all' && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem checked={filterRisk === 'all'} onCheckedChange={() => setFilterRisk('all')}>
                All Risk Levels
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterRisk === 'critical'} onCheckedChange={() => setFilterRisk('critical')}>
                Critical Burnout Risk
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterRisk === 'high'} onCheckedChange={() => setFilterRisk('high')}>
                High Risk
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterRisk === 'medium'} onCheckedChange={() => setFilterRisk('medium')}>
                Medium Risk
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterRisk === 'low'} onCheckedChange={() => setFilterRisk('low')}>
                Low Risk
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-[300px] bg-muted/20 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeam.map((member: any) => (
            <Card key={member.id} className="border-border hover:shadow-md transition-shadow cursor-pointer flex flex-col" onClick={() => setSelectedMember(member)}>
              <CardHeader className="pb-4 border-b border-border bg-muted/10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center font-bold text-xl text-primary shadow-sm">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${member.is_active ? 'bg-green-500' : 'bg-muted'}`}></div>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 flex-1">
                {/* Agreed CTC */}
                {member.agreed_ctc && (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Agreed CTC</span>
                    <span className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {formatCTC(member.agreed_ctc)}
                    </span>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Efficiency</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="font-bold text-lg">{member.efficiency_score}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Tasks Done</p>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-lg">{member.tasks_completed}</span>
                      <span className="text-xs text-muted-foreground">/ {member.tasks_assigned}</span>
                    </div>
                  </div>
                </div>

                {/* Workload */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Workload Capacity</span>
                    <span className={`font-bold ${member.workload_percent > 85 ? 'text-destructive' : 'text-foreground'}`}>
                      {member.workload_percent}%
                    </span>
                  </div>
                  <Progress value={member.workload_percent} className={`h-2 ${member.workload_percent > 85 ? '[&>div]:bg-destructive' : ''}`} />
                </div>

                {/* Burnout Risk */}
                {member.burnout_level && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Flame className={`w-4 h-4 ${member.is_flagged ? 'text-destructive' : ''}`} />
                        Burnout Risk
                      </div>
                      <Badge variant="outline" className={`${getBurnoutColor(member.burnout_level)} capitalize`}>
                        {member.burnout_level}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open: boolean) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[700px] border-border bg-card p-0 overflow-hidden">
          {selectedMember && (
            <>
              <div className="p-6 border-b border-border bg-muted/10">
                <DialogHeader className="flex flex-row items-center gap-4 space-y-0">
                  <div className="h-16 w-16 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center font-bold text-2xl text-primary shadow-sm shrink-0">
                    {selectedMember.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">{selectedMember.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedMember.email}</span>
                      {selectedMember.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedMember.phone}</span>}
                    </DialogDescription>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Stats row */}
                {/* Agreed CTC Banner */}
                {selectedMember.agreed_ctc && (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-3">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-muted-foreground">Pre-Joining Agreed CTC</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-500">{formatCTC(selectedMember.agreed_ctc)}</span>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl text-center border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                    <p className="text-2xl font-bold text-primary">{selectedMember.efficiency_score}%</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl text-center border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Active Tasks</p>
                    <p className="text-2xl font-bold">{selectedMember.current_workload}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl text-center border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Total Done</p>
                    <p className="text-2xl font-bold">{selectedMember.tasks_completed}</p>
                  </div>
                  <div className={`p-4 rounded-xl text-center border ${selectedMember.is_flagged ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border'}`}>
                    <p className="text-xs text-muted-foreground mb-1">Burnout Score</p>
                    <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${selectedMember.is_flagged ? 'text-destructive' : ''}`}>
                      {selectedMember.is_flagged && <AlertCircle className="w-4 h-4" />}
                      {selectedMember.burnout_score || 0}/100
                    </p>
                  </div>
                </div>

                {/* Chart placeholder (in a real app, we'd feed selectedMember.performance_history to Recharts) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Performance History
                  </h3>
                  <div className="h-[250px] bg-muted/10 rounded-xl border border-border p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedMember.performance_history || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="week_start" tickFormatter={(v) => format(new Date(v), 'MMM dd')} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="completion_rate" name="Completion %" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
