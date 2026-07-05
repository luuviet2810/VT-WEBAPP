import { useState } from 'react'
import {
  ShieldCheck,
  ShieldOff,
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
  Plus,
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { isWebAuthnSupported, registerPasskey } from '../utils/webauthn'
import { User, UserStatus } from '../types'

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ duyệt', color: 'text-amber-600', bg: 'bg-amber-100' },
  approved: { label: 'Đã duyệt', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: 'Từ chối', color: 'text-red-600', bg: 'bg-red-100' },
  disabled: { label: 'Vô hiệu', color: 'text-slate-600', bg: 'bg-slate-100' },
}

export default function Employees() {
  const authStore = useAuthStore()
  const addNotification = useStore((s) => s.addNotification)

  const {
    users,
    currentUser,
    isAdmin,
    getPendingUsers,
    approveUser,
    rejectUser,
    enableUser,
    disableUser,
    updateUser,
    deleteUser,
    setUserRole,
    getUserPasskeys,
    removePasskey,
    hasPasskey,
  } = authStore

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showPasskeySetup, setShowPasskeySetup] = useState(false)
  const [passkeySetupError, setPasskeySetupError] = useState('')
  const [passkeySetupSuccess, setPasskeySetupSuccess] = useState(false)

  // Profile form state
  const [fullName, setFullName] = useState(currentUser?.fullName || '')
  const [phone, setPhone] = useState('')

  const pendingUsers = getPendingUsers()
  const isCurrentUserAdmin = isAdmin()

  // Update profile
  const handleUpdateProfile = () => {
    if (!currentUser) return
    updateUser(currentUser.id, { fullName })
  }

  // Register passkey
  const handleRegisterPasskey = async () => {
    if (!currentUser) return
    setPasskeySetupError('')
    setPasskeySetupSuccess(false)

    const credential = await registerPasskey({
      userId: currentUser.id,
      userName: currentUser.email,
      userDisplayName: currentUser.fullName,
    })

    if (credential) {
      authStore.registerPasskey(
        currentUser.id,
        credential.credentialId,
        credential.publicKey,
        credential.deviceName
      )
      setPasskeySetupSuccess(true)
    } else {
      setPasskeySetupError('Không thể đăng ký sinh trắc học. Vui lòng thử lại.')
    }
  }

  // Approve user
  const handleApprove = (user: User) => {
    approveUser(user.id)
    addNotification({
      type: 'user_approved',
      title: 'Phê duyệt tài khoản',
      body: `Tài khoản "${user.fullName}" đã được phê duyệt`,
    })
  }

  // Reject user
  const handleReject = (user: User) => {
    rejectUser(user.id)
    addNotification({
      type: 'user_rejected',
      title: 'Từ chối tài khoản',
      body: `Tài khoản "${user.fullName}" đã bị từ chối`,
    })
  }

  // Delete user
  const handleDelete = (userId: string) => {
    deleteUser(userId)
    setShowDeleteConfirm(null)
  }

  // Toggle role
  const handleToggleRole = (user: User) => {
    const newRole = user.role === 'admin' ? 'employee' : 'admin'
    if (newRole === 'employee' && user.id === currentUser?.id) {
      if (!confirm('Bạn có chắc muốn gỡ quyền Admin của chính mình?')) return
    }
    setUserRole(user.id, newRole)
  }

  // Toggle status
  const handleToggleStatus = (user: User) => {
    if (user.status === 'disabled') {
      enableUser(user.id)
    } else {
      if (user.id === currentUser?.id) {
        alert('Bạn không thể vô hiệu hóa tài khoản của chính mình')
        return
      }
      disableUser(user.id)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nhân viên</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isCurrentUserAdmin
            ? 'Quản lý tài khoản và phê duyệt đăng ký'
            : 'Thông tin tài khoản của bạn'}
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

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleUpdateProfile} className="btn-primary">
            Lưu thay đổi
          </button>

          {/* Passkey setup */}
          {isWebAuthnSupported() && (
            <button
              onClick={() => setShowPasskeySetup(true)}
              className="btn-secondary"
              disabled={hasPasskey(currentUser?.id || '')}
            >
              <Fingerprint size={16} />
              {hasPasskey(currentUser?.id || '') ? 'Đã bật sinh trắc học' : 'Bật Face ID / Vân tay'}
            </button>
          )}
        </div>

        {/* Passkey devices */}
        {hasPasskey(currentUser?.id || '') && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
              <KeyRound size={14} />
              Thiết bị đã đăng ký sinh trắc học
            </div>
            <div className="space-y-2">
              {getUserPasskeys(currentUser?.id || '').map((pk) => (
                <div key={pk.id} className="flex items-center justify-between rounded-lg bg-white p-2">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={16} className="text-slate-400" />
                    <span className="text-sm">{pk.deviceName}</span>
                  </div>
                  <button
                    onClick={() => removePasskey(pk.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Registrations - Admin only */}
      {isCurrentUserAdmin && pendingUsers.length > 0 && (
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
                  {getInitials(user.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">{user.fullName}</div>
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
      {isCurrentUserAdmin && (
        <div className="card p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">
            Tất cả tài khoản ({users.length})
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
                {users.map((user) => {
                  const statusConfig = STATUS_CONFIG[user.status]
                  const isMe = user.id === currentUser?.id
                  const userPasskeys = getUserPasskeys(user.id)

                  return (
                    <tr key={user.id} className={isMe ? 'bg-brand-50/50' : ''}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                            {getInitials(user.fullName)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {user.fullName}
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
                          {/* Enable/Disable */}
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

                          {/* Delete */}
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

      {/* Passkey Setup Modal */}
      {showPasskeySetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
                <Fingerprint className="h-7 w-7 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Bật đăng nhập sinh trắc học</h3>
              <p className="mt-2 text-sm text-slate-600">
                Sử dụng Face ID, Touch ID hoặc Windows Hello để đăng nhập nhanh hơn.
              </p>
            </div>

            {passkeySetupError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-xs text-red-700">{passkeySetupError}</p>
              </div>
            )}

            {passkeySetupSuccess && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <p className="text-xs text-green-700">Đăng ký sinh trắc học thành công!</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasskeySetup(false)
                  setPasskeySetupError('')
                  setPasskeySetupSuccess(false)
                }}
                className="btn-secondary flex-1"
              >
                Đóng
              </button>
              {!passkeySetupSuccess && (
                <button onClick={handleRegisterPasskey} className="btn-primary flex-1">
                  Đăng ký ngay
                </button>
              )}
            </div>
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
