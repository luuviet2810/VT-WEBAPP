import { apiGet, apiPost, apiPut, apiDelete } from './api.client'
import type { CheckOutCheck, CheckSheet, InteriorCheck } from '../types'

export const EMPTY_CHECK_SHEET = {
  interior: {
    driverSeat: { condition: '' as any },
    passengerSeat: { condition: '' as any },
    rearSeat: { condition: '' as any },
  } as InteriorCheck,
  outCheck: {
    conSeongnyeong: { status: '' as any },
    dauMay: { status: '' as any },
    nuocLamMat: { status: '' as any },
    camHanhTrinh: { status: '' as any },
    manHinhBluetooth: { status: '' as any },
    cameraLui: { status: '' as any },
    denPhaCot: { status: '' as any },
    motorGuongNutBam: { status: '' as any },
    dieuHoa: { status: '' as any },
    suoiGhe: { status: '' as any },
    cuaSo: { status: '' as any },
    gheChinhDien: { status: '' as any },
    tinhTrangLop: { status: '' as any },
  } as CheckOutCheck,
} as const

function mapRow(row: Record<string, unknown>): CheckSheet {
  return {
    id: row.id as string,
    vehicleId: (row.vehicle_id as string) ?? (row.vehicleId as string),
    type: row.type as 'in' | 'out',
    checkerId: (row.checker_id as string) ?? (row.checkerId as string) ?? null,
    checkDate: (row.check_date as string) ?? (row.checkDate as string),
    fuelLevel: (row.fuel_level ?? row.fuelLevel) as CheckSheet['fuelLevel'],
    screen: row.screen as CheckSheet['screen'],
    rearCamera: (row.rear_camera ?? row.rearCamera) as CheckSheet['rearCamera'],
    hipass: row.hipass as CheckSheet['hipass'],
    rearSensor: (row.rear_sensor ?? row.rearSensor) as CheckSheet['rearSensor'],
    dashcam: row.dashcam as CheckSheet['dashcam'],
    interior: (row.interior as CheckSheet['interior']) ?? ({
      driverSeat: { condition: '' } as any,
      passengerSeat: { condition: '' } as any,
      rearSeat: { condition: '' } as any,
    }),
    exterior: (row.exterior as CheckSheet['exterior']) ?? {},
    exteriorPhotos: (row.exterior_photos ?? row.exteriorPhotos) as CheckSheet['exteriorPhotos'],
    inputDieuHoa: (row.input_dieu_hoa ?? row.inputDieuHoa) as CheckSheet['inputDieuHoa'],
    inputSuoiGhe: (row.input_suoi_ghe ?? row.inputSuoiGhe) as CheckSheet['inputSuoiGhe'],
    inputTireState: (row.input_tire_state ?? row.inputTireState) as CheckSheet['inputTireState'],
    inputTireInflated: (row.input_tire_inflated ?? row.inputTireInflated) as CheckSheet['inputTireInflated'],
    cabinAirFilter: (row.cabin_air_filter ?? row.cabinAirFilter) as CheckSheet['cabinAirFilter'],
    engineOilLevel: (row.engine_oil_level ?? row.engineOilLevel) as CheckSheet['engineOilLevel'],
    engineAirFilter: (row.engine_air_filter ?? row.engineAirFilter) as CheckSheet['engineAirFilter'],
    inputDenPhaCot: (row.input_den_pha_cot ?? row.inputDenPhaCot) as CheckSheet['inputDenPhaCot'],
    inputMotorGuongNutBam: (row.input_motor_guong_nut_bam ?? row.inputMotorGuongNutBam) as CheckSheet['inputMotorGuongNutBam'],
    inputCuaSo: (row.input_cua_so ?? row.inputCuaSo) as CheckSheet['inputCuaSo'],
    inputGheChinhDien: (row.input_ghe_chinh_dien ?? row.inputGheChinhDien) as CheckSheet['inputGheChinhDien'],
    outputTireInflated: (row.output_tire_inflated ?? row.outputTireInflated) as CheckSheet['outputTireInflated'],
    inputNotes: (row.input_notes ?? row.inputNotes) as string | undefined,
    outCheck: (row.out_check ?? row.outCheck) as CheckSheet['outCheck'],
    outNotes: (row.out_notes ?? row.outNotes) as string | undefined,
    outTireState: (row.out_tire_state ?? row.outTireState) as CheckSheet['outTireState'],
    inputAcquySOH: (row.input_acquy_soh ?? row.inputAcquySOH) as number | undefined,
    inputAcquySOC: (row.input_acquy_soc ?? row.inputAcquySOC) as number | undefined,
    acquySOH: (row.acquy_soh ?? row.acquySOH) as number | undefined,
    acquySOC: (row.acquy_soc ?? row.acquySOC) as number | undefined,
    songNungResultStatus: (row.song_nung_result_status ?? row.songNungResultStatus) as CheckSheet['songNungResultStatus'],
    undercarriageStatus: (row.undercarriage_status ?? row.undercarriageStatus) as CheckSheet['undercarriageStatus'],
    keyType: (row.key_type ?? row.keyType) as CheckSheet['keyType'],
    smartkeyStatus: (row.smartkey_status ?? row.smartkeyStatus) as CheckSheet['smartkeyStatus'],
    outKeyType: (row.out_key_type ?? row.outKeyType) as CheckSheet['outKeyType'],
    outSmartkeyStatus: (row.out_smartkey_status ?? row.outSmartkeyStatus) as CheckSheet['outSmartkeyStatus'],
    createdAt: (row.created_at ?? row.createdAt) as string,
  }
}

export async function getCheckSheets(): Promise<CheckSheet[]> {
  const data = await apiGet<Record<string, unknown>[]>('/api/checksheets')
  return (data || []).map(mapRow)
}

export async function getCheckSheetsByVehicle(vehicleId: string): Promise<CheckSheet[]> {
  const data = await apiGet<Record<string, unknown>[]>(`/api/checksheets?vehicleId=${encodeURIComponent(vehicleId)}`)
  return (data || []).map(mapRow)
}

export async function getCheckSheetById(id: string): Promise<CheckSheet | null> {
  try {
    const data = await apiGet<Record<string, unknown>>(`/api/checksheets/${id}`)
    if (!data) return null
    return mapRow(data)
  } catch (err: any) {
    if (err.statusCode === 404) return null
    throw err
  }
}

export async function createCheckSheet(
  sheet: Omit<CheckSheet, 'id' | 'createdAt'> & { id?: string }
): Promise<CheckSheet> {
  const data = await apiPost<Record<string, unknown>>('/api/checksheets', sheet)
  return mapRow(data)
}

export async function updateCheckSheet(
  id: string,
  patch: Partial<CheckSheet>
): Promise<CheckSheet> {
  const data = await apiPut<Record<string, unknown>>(`/api/checksheets/${id}`, patch)
  return mapRow(data)
}

/**
 * Get existing check sheet for a vehicle + type, or create one.
 * Used by CheckSheetForm on mount for auto-save.
 */
export async function getOrCreateCheckSheet(
  vehicleId: string,
  type: 'in' | 'out',
  defaults?: {
    checkerId?: string | null
    checkDate?: string
    fuelLevel?: CheckSheet['fuelLevel']
    screen?: CheckSheet['screen']
    rearCamera?: CheckSheet['rearCamera']
    hipass?: CheckSheet['hipass']
    rearSensor?: CheckSheet['rearSensor']
    dashcam?: CheckSheet['dashcam']
    interior?: CheckSheet['interior']
    exterior?: CheckSheet['exterior']
    inputDieuHoa?: CheckSheet['inputDieuHoa']
    inputSuoiGhe?: CheckSheet['inputSuoiGhe']
    inputTireState?: CheckSheet['inputTireState']
    inputAcquySOH?: number
    inputAcquySOC?: number
  }
): Promise<{ sheet: CheckSheet; isNew: boolean }> {
  const list = await getCheckSheetsByVehicle(vehicleId)
  const existing = list.find((s) => s.type === type)

  if (existing) {
    return { sheet: existing, isNew: false }
  }

  // No record exists — create a brand-new empty sheet
  const created = await createCheckSheet({
    vehicleId,
    type,
    checkerId: defaults?.checkerId || null,
    checkDate: defaults?.checkDate ?? new Date().toISOString().slice(0, 10),
    fuelLevel: undefined as any,
    screen: undefined as any,
    rearCamera: undefined as any,
    hipass: undefined as any,
    rearSensor: undefined as any,
    dashcam: undefined as any,
    interior: EMPTY_CHECK_SHEET.interior,
    exterior: {} as any,
    exteriorPhotos: undefined,
    inputDieuHoa: undefined as any,
    inputSuoiGhe: undefined as any,
    inputTireState: undefined as any,
    inputTireInflated: undefined,
    outputTireInflated: undefined,
    inputNotes: undefined,
    outCheck: EMPTY_CHECK_SHEET.outCheck,
    outNotes: undefined,
    inputAcquySOH: undefined,
    inputAcquySOC: undefined,
    acquySOH: undefined,
    acquySOC: undefined,
    songNungResultStatus: undefined,
    undercarriageStatus: undefined,
    keyType: undefined,
    smartkeyStatus: undefined,
    outKeyType: undefined,
    outSmartkeyStatus: undefined,
  })

  return { sheet: created, isNew: true }
}

export async function deleteCheckSheet(id: string): Promise<void> {
  await apiDelete(`/api/checksheets/${id}`)
}
