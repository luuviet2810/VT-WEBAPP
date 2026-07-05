import { useStore } from '../store/useStore'

export function useIsAdmin() {
  const employees = useStore((s) => s.employees)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  return employees.find((e) => e.id === currentEmployeeId)?.isAdmin ?? false
}

export function useCurrentEmployee() {
  const employees = useStore((s) => s.employees)
  const currentEmployeeId = useStore((s) => s.currentEmployeeId)
  return employees.find((e) => e.id === currentEmployeeId) ?? null
}
