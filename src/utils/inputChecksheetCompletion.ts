import { EXTERIOR_SPOTS } from '../types'
import type { CheckSheet } from '../types'

/** Các lựa chọn hợp lệ tương ứng với CheckSheetForm đầu vào. */
export function getInputChecksheetMissingFields(sheet: CheckSheet | null | undefined): string[] {
  const missing: string[] = []
  const requireChoice = (label: string, value: unknown, choices: readonly string[]) => {
    if (typeof value !== 'string' || !choices.includes(value)) missing.push(label)
  }

  const s = sheet?.type === 'in' ? sheet : undefined
  requireChoice('Có kết quả Song nưng chưa?', s?.songNungResultStatus, ['draft', 'printed', 'none'])
  requireChoice('Kiểm tra gầm', s?.undercarriageStatus, ['ok', 'slightly_rusty', 'very_rusty'])
  requireChoice('Chìa khóa', s?.keyType, ['smartkey', 'mechanical', 'both'])
  if (s?.keyType === 'smartkey' || s?.keyType === 'both') {
    requireChoice('Số lượng chìa', s.smartkeyStatus, ['one', 'two', 'damaged'])
  }
  requireChoice('Mức nhiên liệu', s?.fuelLevel, ['empty', 'quarter', 'half', 'full'])
  requireChoice('Màn hình', s?.screen, ['normal', 'android', 'broken'])
  requireChoice('Camera lùi', s?.rearCamera, ['ok', 'blurry', 'broken'])
  requireChoice('Hi-Pass', s?.hipass, ['mirror', 'device', 'none'])
  requireChoice('Cảm biến lùi', s?.rearSensor, ['ok', 'broken', 'none'])
  requireChoice('Camera hành trình', s?.dashcam, ['good', 'maybe', 'none'])
  requireChoice('Điều hòa', s?.inputDieuHoa?.status, ['good', 'need_gas'])
  requireChoice('Sưởi ghế', s?.inputSuoiGhe?.status, ['good', 'broken', 'none'])
  requireChoice('Tình trạng lốp', s?.inputTireState?.status, ['ok', 'error', 'none'])
  requireChoice('Bơm lốp chưa?', s?.inputTireInflated, ['ok', 'not_yet'])
  requireChoice('Kiểm tra dầu máy', s?.engineOilLevel, ['sufficient', 'between_marks', 'needs_topup'])
  const equipment = ['ok', 'error', 'none']
  requireChoice('Đèn (Pha, Cốt, Cảnh báo, Phanh)', s?.inputDenPhaCot, equipment)
  requireChoice('Motor Gương, Nút bấm', s?.inputMotorGuongNutBam, equipment)
  requireChoice('Cửa sổ', s?.inputCuaSo, equipment)
  requireChoice('Ghế chỉnh điện', s?.inputGheChinhDien, equipment)
  const interiorChoices = ['good', 'dirty', 'torn']
  requireChoice('Ghế lái', s?.interior?.driverSeat?.condition, interiorChoices)
  requireChoice('Ghế phụ', s?.interior?.passengerSeat?.condition, interiorChoices)
  requireChoice('Hàng ghế sau', s?.interior?.rearSeat?.condition, interiorChoices)
  for (const [key, label] of EXTERIOR_SPOTS) {
    requireChoice(label, s?.exterior?.[key]?.condition, ['good', 'polish', 'dent', 'discolor', 'touchup'])
  }
  // Lọc gió trong, lọc gió dầu máy và ắc quy được phép chưa nhập.
  return missing
}

export function isInputChecksheetComplete(sheet: CheckSheet | null | undefined): boolean {
  return getInputChecksheetMissingFields(sheet).length === 0
}
