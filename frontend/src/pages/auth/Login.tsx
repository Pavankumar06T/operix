import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const navigate = useNavigate()
  const { setAuth, user, token } = useAuthStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && token) {
      if (user.role === 'manager' && user.department === 'HR') navigate('/hr', { replace: true })
      else if (user.role === 'manager') navigate('/manager', { replace: true })
      else if (user.role === 'employee') navigate('/employee', { replace: true })
      else navigate('/client', { replace: true })
    }
  }, [user, token, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const res = await api.post('/auth/login', data)
      if (res.data.success) {
        const { user, accessToken, sessionId } = res.data.data
        setAuth(user, accessToken, sessionId)
        
        toast({
          title: 'Welcome back!',
          description: `Logged in successfully as ${user.name}`,
        })

        // Redirect based on role
        if (user.role === 'manager' && user.department === 'HR') navigate('/hr')
        else if (user.role === 'manager') navigate('/manager')
        else if (user.role === 'employee') navigate('/employee')
        else navigate('/client')
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: err.response?.data?.message || 'Invalid email or password',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-20 h-20 bg-background rounded-2xl overflow-hidden flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Operix Logo" className="w-full h-full object-cover rounded-2xl" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            OPERIX
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Predict. Prevent. Perform.</p>
        </div>

        <div className="bg-card border border-border shadow-2xl rounded-2xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                  {...register('email')}
                />
                {errors.email && <p className="text-sm text-destructive font-medium">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={errors.password ? 'border-destructive focus-visible:ring-destructive pr-10' : 'pr-10'}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive font-medium">{errors.password.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Protected by enterprise-grade security.
        </p>
      </div>
    </div>
  )
}
