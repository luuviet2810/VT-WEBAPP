// ====== 403 FORBIDDEN PAGE ======

import { useNavigate } from 'react-router-dom'

export default function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">403</h1>
        <p className="mb-6 text-lg text-slate-600">Bạn không có quyền truy cập trang này</p>
        <p className="mb-8 text-sm text-slate-500">
          Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          Quay lại trang chủ
        </button>
      </div>
    </div>
  )
}
