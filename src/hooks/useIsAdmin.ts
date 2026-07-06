/**
 * Legacy admin check — reads from the employees store array.
 * Use `useIsAdminMode()` from `hooks/useAuthRole` for RBAC-based role checks.
 *
 * This hook checks if the current employee (by currentEmployeeId) has isAdmin=true.
 * The other hook checks the effective role (considering viewMode preview).
 * They are semantically different — keep both.
 */

import { useStore } from '../store/useStore'

export function useIsAdmin(): boolean {
  const employees = useStore((s) => s.employees)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  return employees.find((e) => e.id === currentEmployeeId)?.isAdmin ?? false
}

export function useCurrentEmployee() {
  const employees = useStore((s) => s.employees)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  return employees.find((e) => e.id === currentEmployeeId) ?? null
}
