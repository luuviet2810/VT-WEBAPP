import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  UserRound,
  CheckCircle2,
  XCircle,
  Trash2,
  UserX,
  UserCheck,
  Clock,
  Fingerprint,
  KeyRound,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { isWebAuthnSupported } from '../utils/webauthn'
import type { AuthProfile } from '../services/auth.service'
import { UserStatus } from '../types'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ duyệt', color: 'text-amber-600', bg: 'bg-amber-100' },
  approved: { label: 'Đã duyệt', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: 'Từ chối', color: 'text-red-600', bg: 'bg-red-100' },
  disabled: { label: 'Vô hiệu', color: 'text-slate-600', bg: 'bg-slate-100' },
}

export default function Employees() {
  const { currentUser } = useAuthStore()
  const addNotification = useStore((s) => s.addNotification)
  const isAdminUser = currentUser?.role === 'admin'

  const [users, setUsers] = useState<AuthProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showPasskeySetup, setShowPasskeySetup] = useState(false)
  const [passkeySetupError, setPasskeySetupError] = useState('')
  const [passkeySetupSuccess, setPasskeySetupSuccess] = useState(false)

  const [fullName, setFullName] = useState(currentUser?.name || '')

  const pendingUsers = users.filter((u) => u.status === 'pending')
  const approvedUsers = users.filter((u) => u.status === 'approved')

  const loadUsers = useCallback(async () => {
    const { supabase } = await import('../lib/supabase')
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    if (error || !data) {
      setLoading(false)
      return
    }

    const rows = data as Record<string, unknown>[]
    setUsers(
      rows.map((row) => {
        const name = row.name as string
        return {
          id: row.id as string,
          authId: row.auth_id as string,
          name,
          fullName: name,
          email: row.email as string,
          role: (row.role as 'admin' | 'staff') ?? 'staff',
          status: (row.status as 'pending' | 'approved' | 'rejected' | 'disabled') ?? 'pending',
          disabled: Boolean(row.disabled),
          passkeyEnabled: Boolean(row.passkey_enabled),
          phone: (row.phone as string | null) ?? null,
          avatar: (row.avatar as string | null) ?? null,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        } satisfies AuthProfile
      })
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleUpdateProfile = async () => {
    if (!currentUser) return
    const { supabase } = await import('../lib/supabase')
    await supabase
      .from('users')
      .update({ name: fullName, updated_at: new Date().toISOString() })
      .eq('auth_id', currentUser.authId)
    await loadUsers()
    addNotification({ type: 'system', title: 'Hồ sơ', body: 'Hồ sơ đã được cập nhật' })
  }

  const handleApprove = async (user: AuthProfile) => {
    const { supabase } = await import('../lib/supabase')
    await supabase
      .from('users')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', user.id)
    await loadUsers()
    addNotification({
      type: 'user_approved',
      title: 'Phê duyệt tài khoản',
      body: `Tài khoản "${user.name}" đã được phê duyệt`,
    })
  }

  const handleReject = async (user: AuthProfile) => {
    const { supabase } = await import('../lib/supabase')
    await supabase
      .from('users')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', user.id)
    await loadUsers()
    addNotification({
      type: 'user_rejected',
      title: 'Từ chối tài khoản',
      body: `Tài khoản "${user.name}" đã bị từ chối`,
    })
  }

  const handleDelete = async (userId: string) => {
    const { supabase } = await import('../lib/supabase')
    await supabase.from('users').delete().eq('id', userId)
    await loadUsers()
    setShowDeleteConfirm(null)
  }

  const handleToggleRole = async (user: AuthProfile) => {
    const newRole = user.role === 'admin' ? 'staff' : 'admin'
    if (newRole === 'staff' && user.id === currentUser?.id) {
      if (!confirm('Bạn có chắc muốn gỡ quyền Admin của chính mình?')) return
    }
    const { supabase } = await import('../lib/supabase')
    await supabase
      .from('users')
      .update({ role: newRole, is_admin: newRole === 'admin', updated_at: new Date().toISOString() })
      .eq('id', user.id)
    await loadUsers()
  }

  const handleToggleStatus = async (user: AuthProfile) => {
    if (user.status === 'disabled') {
      const { supabase } = await import('../lib/supabase')
      await supabase
        .from('users')
        .update({ disabled: false, status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', user.id)
    } else {
      if (user.id === currentUser?.id) {
        alert('Bạn không thể vô hiệu hóa tài khoản của chính mình')
        return
      }
      const { supabase } = await import('../lib/supabase')
      await supabase
        .from('users')
        .update({ disabled: true, status: 'disabled', updated_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    await loadUsers()
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nhân viên</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdminUser ? 'Quản lý tài khoản và phê duyệt đăng ký' : 'Thông tin tài khoản của bạn'}
        </p>
      </div>

      {/* My Profile */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <UserRound size={16} className="text-slate-400" />
          Hồ sơ của tôi
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Họ tên</label>
            <input
              className="input w-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Họ tên"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input w-full bg-slate-50" value={currentUser?.email || ''} disabled />
          </div>
        </div>

        <button onClick={handleUpdateProfile} className="btn-primary">
          Lưu thay đổi
        </button>
      </div>

      {/* Pending Registrations - Admin only */}
      {isAdminUser && pendingUsers.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Clock size={18} />
            Yêu cầu đăng ký ({pendingUsers.length})
          </div>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                  {getInitials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Đăng ký: {formatDate(user.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(user)}
                    className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                  >
                    <CheckCircle2 size={16} />
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleReject(user)}
                    className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                  >
                    <XCircle size={16} />
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users - Admin only */}
      {isAdminUser && (
        <div className="card p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">
            Tất cả tài khoản ({approvedUsers.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="pb-3 font-medium">Người dùng</th>
                  <th className="pb-3 font-medium">Trạng thái</th>
                  <th className="pb-3 font-medium">Vai trò</th>
                  <th className="pb-3 font-medium">Đăng ký</th>
                  <th className="pb-3 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {approvedUsers.map((user) => {
                  const statusConfig = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.pending
                  const isMe = user.id === currentUser?.id

                  return (
                    <tr key={user.id} className={isMe ? 'bg-brand-50/50' : ''}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {user.name}
                              {isMe && <span className="ml-1 text-xs text-brand-600">(bạn)</span>}
                            </div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleRole(user)}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            user.role === 'admin'
                              ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <>
                              <ShieldCheck size={12} /> Admin
                            </>
                          ) : (
                            <>
                              <UserRound size={12} /> Nhân viên
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={isMe}
                            className={`rounded-lg p-1.5 text-xs transition-colors ${
                              user.status === 'disabled'
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            } ${isMe ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={user.status === 'disabled' ? 'Kích hoạt' : 'Vô hiệu hóa'}
                          >
                            {user.status === 'disabled' ? <UserCheck size={14} /> : <UserX size={14} />}
                          </button>

                          {!isMe && (
                            <button
                              onClick={() => setShowDeleteConfirm(user.id)}
                              className="rounded-lg bg-red-50 p-1.5 text-xs text-red-500 transition-colors hover:bg-red-100"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Xóa tài khoản?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến tài khoản này sẽ bị xóa.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1">
                Hủy
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-danger flex-1">
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
