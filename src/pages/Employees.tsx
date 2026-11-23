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
import { getUsers, updateUser, deleteUser, approveUser, rejectUser } from '../services/users.service'
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
  const nonPendingUsers = users.filter((u) => u.status !== 'pending')

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error('[Employees] loadUsers error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleUpdateProfile = async () => {
    if (!currentUser) return
    try {
      await updateUser(currentUser.id, { name: fullName })
      await loadUsers()
      addNotification({ type: 'system', title: 'Hồ sơ', body: 'Hồ sơ đã được cập nhật' })
    } catch (err) {
      console.error('[Employees] handleUpdateProfile error:', err)
    }
  }

  const handleApprove = async (user: AuthProfile) => {
    try {
      await approveUser(user.id)
      await loadUsers()
      addNotification({
        type: 'user_approved',
        title: 'Phê duyệt tài khoản',
        body: `Tài khoản "${user.name}" (${user.email}) đã được phê duyệt`,
      })
    } catch (err: any) {
      console.error('[Employees] handleApprove error:', err)
      alert(err.message || 'Lỗi khi phê duyệt tài khoản')
    }
  }

  const handleReject = async (user: AuthProfile) => {
    if (!window.confirm(`Bạn có chắc chắn muốn từ chối tài khoản "${user.name}" (${user.email})?`)) {
      return
    }
    try {
      await rejectUser(user.id)
      await loadUsers()
      addNotification({
        type: 'user_rejected',
        title: 'Từ chối tài khoản',
        body: `Tài khoản "${user.name}" (${user.email}) đã bị từ chối`,
      })
    } catch (err: any) {
      console.error('[Employees] handleReject error:', err)
      alert(err.message || 'Lỗi khi từ chối tài khoản')
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId)
      await loadUsers()
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('[Employees] handleDelete error:', err)
    }
  }

  const handleToggleRole = async (user: AuthProfile) => {
    const newRole = user.role === 'admin' ? 'staff' : 'admin'
    if (newRole === 'staff' && user.id === currentUser?.id) {
      if (!confirm('Bạn có chắc muốn gỡ quyền Admin của chính mình?')) return
    }
    try {
      await updateUser(user.id, { role: newRole })
      await loadUsers()
    } catch (err) {
      console.error('[Employees] handleToggleRole error:', err)
    }
  }

  const handleToggleStatus = async (user: AuthProfile) => {
    try {
      if (user.status === 'disabled') {
        await updateUser(user.id, { disabled: false, status: 'approved' })
      } else {
        if (user.id === currentUser?.id) {
          alert('Bạn không thể vô hiệu hóa tài khoản của chính mình')
          return
        }
        await updateUser(user.id, { disabled: true, status: 'disabled' })
      }
      await loadUsers()
    } catch (err) {
      console.error('[Employees] handleToggleStatus error:', err)
    }
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
      {isAdminUser && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Clock size={18} className="text-amber-500" />
              Tài khoản chờ phê duyệt ({pendingUsers.length})
            </div>
            {pendingUsers.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {pendingUsers.length} yêu cầu mới
              </span>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              Hiện không có yêu cầu đăng ký nào đang chờ phê duyệt.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-800">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>Đăng ký: {formatDate(user.createdAt)}</span>
                        <span>•</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                          Chờ duyệt
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(user)}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
                    >
                      <CheckCircle2 size={16} />
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleReject(user)}
                      className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      <XCircle size={16} />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Users - Admin only */}
      {isAdminUser && (
        <div className="card p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">
            Tất cả tài khoản ({nonPendingUsers.length})
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
                {nonPendingUsers.map((user) => {
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
                          {user.status === 'rejected' && (
                            <button
                              onClick={() => handleApprove(user)}
                              className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                              title="Phê duyệt lại tài khoản này"
                            >
                              <CheckCircle2 size={13} />
                              Duyệt
                            </button>
                          )}

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
