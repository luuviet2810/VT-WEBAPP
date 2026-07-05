import { useState } from 'react'
import { Save, Settings } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useIsAdmin } from '../hooks/useIsAdmin'
import { Modal } from '../components/ui'

export default function SettingsPanel() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const isAdmin = useIsAdmin()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...settings })

  function openModal() {
    setForm({ ...settings })
    setOpen(true)
  }

  function save() {
    updateSettings(form)
    setOpen(false)
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  if (!isAdmin) return null

  return (
    <>
      <button onClick={openModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
        <Settings size={20} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Cài đặt Admin">
        <div className="space-y-5">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Thông tin công ty</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Tên công ty</label>
                <input className="input" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </div>
              <div>
                <label className="label">Số điện thoại công ty</label>
                <input className="input" value={form.companyPhone} onChange={(e) => set('companyPhone', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Giờ làm việc</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Giờ bắt đầu</label>
                <input type="time" className="input" value={form.workStartHour} onChange={(e) => set('workStartHour', e.target.value)} />
              </div>
              <div>
                <label className="label">Giờ kết thúc</label>
                <input type="time" className="input" value={form.workEndHour} onChange={(e) => set('workEndHour', e.target.value)} />
              </div>
              <div>
                <label className="label">Giờ làm/ngày</label>
                <input type="number" className="input" min={1} max={24} value={form.workHoursPerDay} onChange={(e) => set('workHoursPerDay', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Tăng ca</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Hệ số OT (ngày thường)</label>
                <input type="number" className="input" step={0.1} min={1} value={form.overtimeMultiplier} onChange={(e) => set('overtimeMultiplier', Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Hệ số OT (đêm / ngày lễ)</label>
                <input type="number" className="input" step={0.1} min={1} value={form.nightOvertimeMultiplier} onChange={(e) => set('nightOvertimeMultiplier', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Chấm công</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Bán kính GPS cho phép (m)</label>
                <input type="number" className="input" min={10} value={form.gpsRadiusMeters} onChange={(e) => set('gpsRadiusMeters', Number(e.target.value))} />
                <p className="mt-1 text-xs text-slate-400">Chỉ cho phép check-in khi ở trong bán kính này</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300 text-brand-600" checked={form.latePenalty30Min} onChange={(e) => set('latePenalty30Min', e.target.checked)} />
                <span className="text-sm text-slate-700">Muộn dưới 30 phút trừ 30 phút công</span>
              </label>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={save}>
            <Save size={16} />
            Lưu cài đặt
          </button>
        </div>
      </Modal>
    </>
  )
}
