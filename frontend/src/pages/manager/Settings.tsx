import { useState, useRef, useEffect } from 'react'
import { User, Bell, Shield, Paintbrush, LogOut, Check } from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Simple Tailwind Toggle Switch Component
const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
  </label>
)

const accentColors = [
  { name: 'Blue', value: '217.2 91.2% 59.8%' },
  { name: 'Purple', value: '262.1 83.3% 57.8%' },
  { name: 'Rose', value: '346.8 77.2% 49.8%' },
  { name: 'Green', value: '142.1 76.2% 36.3%' },
  { name: 'Orange', value: '24.6 95% 53.1%' },
]

export function Settings() {
  const { user, token, setAuth, logout } = useAuthStore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local preferences state
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushAlerts, setPushAlerts] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)
  const [accent, setAccent] = useState(accentColors[0].value)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    // Load preferences from local storage
    const prefs = localStorage.getItem('operix-prefs')
    if (prefs) {
      const p = JSON.parse(prefs)
      setEmailAlerts(p.emailAlerts ?? true)
      setPushAlerts(p.pushAlerts ?? true)
      setWeeklyReports(p.weeklyReports ?? true)
      if (p.theme) {
        setTheme(p.theme)
        document.documentElement.classList.toggle('dark', p.theme === 'dark')
      } else {
        document.documentElement.classList.add('dark')
      }
      if (p.accent) {
        setAccent(p.accent)
        document.documentElement.style.setProperty('--primary', p.accent)
      }
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    
    // Save preferences locally
    localStorage.setItem('operix-prefs', JSON.stringify({
      emailAlerts, pushAlerts, weeklyReports, accent, theme
    }))

    setTimeout(() => {
      setIsSaving(false)
      toast({ title: 'Settings Saved', description: 'Your preferences have been successfully updated.' })
    }, 800)
  }

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const changeAccent = (color: string) => {
    setAccent(color)
    document.documentElement.style.setProperty('--primary', color)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Avatar must be less than 2MB' })
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setIsUploading(true)
      try {
        const res = await api.post('/auth/update-profile', { avatarBase64: base64 })
        if (res.data.success && token) {
          setAuth(res.data.data.user, token) // Update store with new user data
          toast({ title: 'Avatar Updated', description: 'Your profile picture has been changed.' })
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: err.response?.data?.message || 'Could not update avatar'
        })
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="profile" className="gap-2"><User className="w-4 h-4" /> Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="w-4 h-4" /> Security</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Paintbrush className="w-4 h-4" /> Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary border border-primary/30 overflow-hidden relative">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.substring(0, 2).toUpperCase()
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleAvatarChange} 
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Change Avatar'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Security & Access</CardTitle>
              <CardDescription>Manage your password and session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current">Current Password</Label>
                  <Input id="current" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">New Password</Label>
                  <Input id="new" type="password" />
                </div>
                <Button>Update Password</Button>
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-medium text-destructive mb-4">Danger Zone</h3>
                <Button variant="destructive" onClick={logout} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out of All Devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what updates you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Email Alerts</h4>
                  <p className="text-sm text-muted-foreground">Receive critical AI alerts directly in your inbox.</p>
                </div>
                <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Push Notifications</h4>
                  <p className="text-sm text-muted-foreground">Get browser notifications for urgent tasks.</p>
                </div>
                <Toggle checked={pushAlerts} onChange={setPushAlerts} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Weekly Burnout Reports</h4>
                  <p className="text-sm text-muted-foreground">Receive automated Gemini reports on team health.</p>
                </div>
                <Toggle checked={weeklyReports} onChange={setWeeklyReports} />
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of Operix.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Theme Mode</h4>
                <div className="flex gap-4">
                  <div 
                    onClick={() => changeTheme('dark')}
                    className={`border-2 rounded-lg p-4 cursor-pointer bg-card flex-1 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-primary' : 'border-border opacity-70 hover:opacity-100'}`}
                  >
                    <div className="w-full h-12 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-center text-xs text-muted-foreground">Dark UI</div>
                    <span className="text-sm font-medium">Dark Mode {theme === 'dark' && '(Active)'}</span>
                  </div>
                  <div 
                    onClick={() => changeTheme('light')}
                    className={`border-2 rounded-lg p-4 cursor-pointer bg-card flex-1 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-primary' : 'border-border opacity-70 hover:opacity-100'}`}
                  >
                    <div className="w-full h-12 bg-white rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500">Light UI</div>
                    <span className="text-sm font-medium">Light Mode {theme === 'light' && '(Active)'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Accent Color</h4>
                <div className="flex flex-wrap gap-4">
                  {accentColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => changeAccent(color.value)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${accent === color.value ? 'ring-2 ring-offset-2 ring-offset-background ring-white scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: `hsl(${color.value})` }}
                      title={color.name}
                    >
                      {accent === color.value && <Check className="w-5 h-5 text-white" />}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Changes to accent color are applied instantly.</p>
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
