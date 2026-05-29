import { useState, useEffect } from 'react'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, RefreshCcw, Monitor, Download, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#4F6EF7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function TimeTracking() {
  const { teamOverview, isLoadingTeam, refetchTeamOverview, fetchTechnologies } = useTimeTracking()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [techData, setTechData] = useState<any[]>([])
  const [isLoadingTech, setIsLoadingTech] = useState(false)

  useEffect(() => {
    if (selectedEmployeeId) {
      setIsLoadingTech(true)
      fetchTechnologies(selectedEmployeeId, 'week')
        .then(data => setTechData(data || []))
        .catch(err => console.error(err))
        .finally(() => setIsLoadingTech(false))
    } else {
      setTechData([])
    }
  }, [selectedEmployeeId])

  const handleExportCSV = () => {
    if (!teamOverview || teamOverview.length === 0) return
    
    const headers = ['Employee Name', 'Department', 'Status', 'Current Task', 'Active Since', 'Today Total', 'Top Tech Today']
    const rows = teamOverview.map((m: any) => [
      `"${m.name}"`,
      `"${m.department || 'Engineering'}"`,
      `"${m.status}"`,
      `"${m.currentTask}"`,
      `"${m.activeSince || ''}"`,
      `"${m.todayActiveTime}"`,
      `"${m.topTechnology}"`
    ])
    
    const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `operix_time_tracking_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">Live team status and productivity analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchTeamOverview()}>
            <RefreshCcw className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-2 bg-[#4F6EF7] text-white hover:bg-[#4F6EF7]/90" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Live Team Status */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Team Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTeam ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : !teamOverview || teamOverview.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No active team members.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/20 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Employee</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Current Task</th>
                    <th className="px-4 py-3 font-medium">Active Since</th>
                    <th className="px-4 py-3 font-medium">Today Total</th>
                    <th className="px-4 py-3 font-medium rounded-tr-lg">Top Tech Today</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teamOverview.map((member: any) => (
                    <tr 
                      key={member.id} 
                      className={`hover:bg-muted/10 transition-colors cursor-pointer ${selectedEmployeeId === member.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedEmployeeId(member.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.department || 'Engineering'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.status.includes('Active') ? 'bg-green-500/10 text-green-500' :
                          member.status.includes('Idle') ? 'bg-amber-500/10 text-amber-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={member.currentTask}>
                        {member.currentTask}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {member.activeSince || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {member.todayActiveTime}
                      </td>
                      <td className="px-4 py-3">
                        {member.topTechnology !== 'None' ? (
                          <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-xs">
                            {member.topTechnology}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technology Usage */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Technology Usage (This Week)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {!selectedEmployeeId ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Monitor className="w-8 h-8 mb-2 opacity-30" />
                <p>Click on an employee in the table to view</p>
              </div>
            ) : isLoadingTech ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <p>Loading data...</p>
              </div>
            ) : techData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <p>No technology data found for this week.</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={techData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="totalHours"
                      nameKey="technology"
                    >
                      {techData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} hours`, 'Time Spent']}
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Hours Comparison */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-green-500" />
              Today's Active Time (Minutes)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {!teamOverview || teamOverview.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Clock className="w-8 h-8 mb-2 opacity-30" />
                <p>No data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#374151', opacity: 0.4 }}
                    formatter={(value: any) => [`${value} mins`, 'Active Time']}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  />
                  <Bar dataKey="todayActiveMins" fill="#4F6EF7" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
