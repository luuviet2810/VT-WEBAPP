import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Eye, EyeOff, AlertCircle, ArrowLeft, Clock } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { signUpWithEmail } from '../services/auth.service'
import { VTLogo } from '../components/VTLogo'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, authLoading } = useAuthStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pending, setPending] = useState(false)

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName || trimmedName.length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Định dạng email không hợp lệ')
      return
    }

    if (!password || password.length < 6) {
      setError('Mật khẩu phải có độ dài tối thiểu 6 ký tự')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setIsLoading(true)

    const result = await signUpWithEmail(trimmedName, trimmedEmail, password, confirmPassword)

    if (result.ok) {
      setPending(true)
    } else {
      setError(result.error || 'Đăng ký thất bại')
    }

    setIsLoading(false)
  }

  if (pending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
        <div className="w-full max-w-md text-center">
          <VTLogo size="lg" priority alt="VT AUTO" className="mb-6 max-w-[220px]" />
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Clock className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Đăng ký thành công!</h2>
            <p className="mt-3 text-sm text-slate-600">
              Tài khoản của bạn đang chờ Admin phê duyệt. Bạn sẽ có thể đăng nhập sau khi được duyệt.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600"
        >
          <ArrowLeft size={16} />
          Quay lại đăng nhập
        </Link>

        <div className="mb-8 text-center">
          <VTLogo size="lg" priority alt="VT AUTO" className="mb-3 max-w-[220px]" />
          <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản mới</h1>
          <p className="mt-1 text-sm text-slate-500">Điền thông tin bên dưới để đăng ký</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label">Họ và tên</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Nhập họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

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
                  placeholder="Ít nhất 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            <div>
              <label className="label">Xác nhận mật khẩu</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input w-full"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang đăng ký...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus size={18} />
                  Đăng ký
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs text-blue-700">
              Sau khi đăng ký, tài khoản của bạn sẽ được Admin phê duyệt trước khi có thể đăng nhập.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
