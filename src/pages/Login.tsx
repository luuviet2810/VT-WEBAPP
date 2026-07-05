import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Fingerprint, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { isWebAuthnSupported, isBiometricAvailable, authenticateWithPasskey } from '../utils/webauthn'
import { UserRole } from '../rbac/roles'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWithPasskey, currentUser, isAuthenticated } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  // Check biometric availability on mount
  useState(() => {
    isBiometricAvailable().then(setBiometricAvailable)
  })

  // Redirect if already logged in
  if (isAuthenticated || currentUser) {
    navigate('/')
    return null
  }

  // Get redirect path based on user role
  const getRedirectPath = (role: UserRole) => {
    return '/'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 500))

    const result = login(email, password)

    if (result.success) {
      // Get current user from store after login
      const user = useAuthStore.getState().currentUser
      navigate(getRedirectPath(user?.role as UserRole || 'staff'))
    } else {
      setError(result.error || 'Đăng nhập thất bại')
    }

    setIsLoading(false)
  }

  const handlePasskeyLogin = async (credentialId: string) => {
    setError('')
    setIsLoading(true)

    const result = await authenticateWithPasskey({
      credentialId,
      userName: email || 'user',
    })

    if (result.success) {
      loginWithPasskey(credentialId)
      navigate('/')
    } else {
      setError(result.error || 'Đăng nhập bằng sinh trắc học thất bại')
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg">
            <span className="text-2xl font-bold text-white">VT</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">VT AUTO</h1>
          <p className="mt-1 text-sm text-slate-500">Đăng nhập để tiếp tục</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input w-full"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input w-full pr-10"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang đăng nhập...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn size={18} />
                  Đăng nhập
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400">hoặc</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Biometric Login */}
          {isWebAuthnSupported() && (
            <button
              type="button"
              onClick={() => {
                // In a real app, this would show a passkey selector
                // For demo, we'll show a message
                setError('Vui lòng đăng nhập bằng email trước để thiết lập sinh trắc học')
              }}
              className="btn-secondary w-full"
            >
              <span className="flex items-center justify-center gap-2">
                <Fingerprint size={18} />
                Đăng nhập bằng sinh trắc học
              </span>
            </button>
          )}

          {!isWebAuthnSupported() && (
            <p className="text-center text-xs text-slate-400">
              Trình duyệt không hỗ trợ đăng nhập sinh trắc học
            </p>
          )}
        </div>

        {/* Register Link */}
        <p className="mt-6 text-center text-sm text-slate-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
            <span className="flex items-center justify-center gap-1">
              <UserPlus size={16} />
              Đăng ký ngay
            </span>
          </Link>
        </p>

        {/* Demo Credentials */}
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Tài khoản demo (Admin):</p>
          <p className="text-xs text-slate-600">Email: admin@gara.vn</p>
          <p className="text-xs text-slate-600">Mật khẩu: admin123</p>
        </div>
      </div>
    </div>
  )
}
