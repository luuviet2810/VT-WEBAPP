import { supabase } from '../lib/supabase'
import type {
  CheckOutCheck,
  CheckOutItem,
  CheckSheet,
  ConSeongnyeongItem,
  ConSeongnyeongStatus,
  DauMayItem,
  DauMayStatus,
  DieuHoaItem,
  DieuHoaStatus,
  ExteriorCheck,
  InteriorCheck,
  NuocLamMatItem,
  NuocLamMatStatus,
  SuoiGheItem,
  SuoiGheStatus,
} from '../types'

/**
 * Single source of truth for an empty checksheet.
 * Every field is null/undefined — no pre-selected values.
 * Used by both the service layer and the form component.
 */
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
    vehicleId: row.vehicle_id as string,
    type: row.type as 'in' | 'out',
    checkerId: row.checker_id as string | null,
    checkDate: row.check_date as string,
    fuelLevel: row.fuel_level as CheckSheet['fuelLevel'],
    screen: row.screen as CheckSheet['screen'],
    rearCamera: row.rear_camera as CheckSheet['rearCamera'],
    hipass: row.hipass as CheckSheet['hipass'],
    rearSensor: row.rear_sensor as CheckSheet['rearSensor'],
    dashcam: row.dashcam as CheckSheet['dashcam'],
    interior: (row.interior as CheckSheet['interior']) ?? ({
      driverSeat: { condition: '' } as any,
      passengerSeat: { condition: '' } as any,
      rearSeat: { condition: '' } as any,
    }),
    exterior: (row.exterior as CheckSheet['exterior']) ?? {},
    exteriorPhotos: row.exterior_photos as CheckSheet['exteriorPhotos'],
    inputDieuHoa: row.input_dieu_hoa as CheckSheet['inputDieuHoa'],
    inputSuoiGhe: row.input_suoi_ghe as CheckSheet['inputSuoiGhe'],
    inputTireState: row.input_tire_state as CheckSheet['inputTireState'],
    inputNotes: row.input_notes as string | undefined,
    outCheck: row.out_check as CheckSheet['outCheck'],
    outNotes: row.out_notes as string | undefined,
    inputAcquySOH: row.input_acquy_soh as number | undefined,
    inputAcquySOC: row.input_acquy_soc as number | undefined,
    acquySOH: row.acquy_soh as number | undefined,
    acquySOC: row.acquy_soc as number | undefined,
    songNungResultStatus: row.song_nung_result_status as CheckSheet['songNungResultStatus'],
    keyType: row.key_type as CheckSheet['keyType'],
    smartkeyStatus: row.smartkey_status as CheckSheet['smartkeyStatus'],
    createdAt: row.created_at as string,
  }
}

export async function getCheckSheets(): Promise<CheckSheet[]> {
  const { data, error, status, statusText } = await supabase
    .from('check_sheets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getCheckSheetsByVehicle(vehicleId: string): Promise<CheckSheet[]> {
  const { data, error } = await supabase
    .from('check_sheets')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getCheckSheetById(id: string): Promise<CheckSheet | null> {
  const { data, error } = await supabase
    .from('check_sheets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRow(data as Record<string, unknown>)
}

export async function createCheckSheet(
  sheet: Omit<CheckSheet, 'id' | 'createdAt'>
): Promise<CheckSheet> {
  const payload = {
    vehicle_id: sheet.vehicleId,
    type: sheet.type,
    checker_id: sheet.checkerId || null,
    check_date: sheet.checkDate,
    fuel_level: sheet.fuelLevel,
    screen: sheet.screen,
    rear_camera: sheet.rearCamera,
    hipass: sheet.hipass,
    rear_sensor: sheet.rearSensor,
    dashcam: sheet.dashcam,
    interior: sheet.interior,
    exterior: sheet.exterior,
    exterior_photos: sheet.exteriorPhotos,
    input_dieu_hoa: sheet.inputDieuHoa,
    input_suoi_ghe: sheet.inputSuoiGhe,
    input_tire_state: sheet.inputTireState,
    input_notes: sheet.inputNotes,
    out_check: sheet.outCheck,
    out_notes: sheet.outNotes,
    input_acquy_soh: sheet.inputAcquySOH,
    input_acquy_soc: sheet.inputAcquySOC,
    acquy_soh: sheet.acquySOH,
    acquy_soc: sheet.acquySOC,
    song_nung_result_status: sheet.songNungResultStatus,
    key_type: sheet.keyType,
    smartkey_status: sheet.smartkeyStatus,
  }

  const { data, error } = await supabase
    .from('check_sheets')
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw error
  }
  return mapRow(data as Record<string, unknown>)
}

export async function updateCheckSheet(
  id: string,
  patch: Partial<CheckSheet>
): Promise<CheckSheet> {
  const updateData: Record<string, unknown> = {}

  if (patch.vehicleId !== undefined) updateData.vehicle_id = patch.vehicleId
  if (patch.type !== undefined) updateData.type = patch.type
  if (patch.checkerId !== undefined) updateData.checker_id = patch.checkerId || null
  if (patch.checkDate !== undefined) updateData.check_date = patch.checkDate
  if (patch.fuelLevel !== undefined) updateData.fuel_level = patch.fuelLevel
  if (patch.screen !== undefined) updateData.screen = patch.screen
  if (patch.rearCamera !== undefined) updateData.rear_camera = patch.rearCamera
  if (patch.hipass !== undefined) updateData.hipass = patch.hipass
  if (patch.rearSensor !== undefined) updateData.rear_sensor = patch.rearSensor
  if (patch.dashcam !== undefined) updateData.dashcam = patch.dashcam
  if (patch.interior !== undefined) updateData.interior = patch.interior
  if (patch.exterior !== undefined) updateData.exterior = patch.exterior
  if (patch.exteriorPhotos !== undefined) updateData.exterior_photos = patch.exteriorPhotos
  if (patch.inputDieuHoa !== undefined) updateData.input_dieu_hoa = patch.inputDieuHoa
  if (patch.inputSuoiGhe !== undefined) updateData.input_suoi_ghe = patch.inputSuoiGhe
  if (patch.inputTireState !== undefined) updateData.input_tire_state = patch.inputTireState
  if (patch.inputNotes !== undefined) updateData.input_notes = patch.inputNotes
  if (patch.outCheck !== undefined) updateData.out_check = patch.outCheck
  if (patch.outNotes !== undefined) updateData.out_notes = patch.outNotes
  if (patch.inputAcquySOH !== undefined) updateData.input_acquy_soh = patch.inputAcquySOH
  if (patch.inputAcquySOC !== undefined) updateData.input_acquy_soc = patch.inputAcquySOC
  if (patch.acquySOH !== undefined) updateData.acquy_soh = patch.acquySOH
  if (patch.acquySOC !== undefined) updateData.acquy_soc = patch.acquySOC
  if (patch.songNungResultStatus !== undefined) updateData.song_nung_result_status = patch.songNungResultStatus
  if (patch.keyType !== undefined) updateData.key_type = patch.keyType
  if (patch.smartkeyStatus !== undefined) updateData.smartkey_status = patch.smartkeyStatus

  // Drop empty-string UUIDs to avoid Postgres 22P02
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === '') updateData[key] = null
  })

  const { data, error } = await supabase
    .from('check_sheets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }
  return mapRow(data as Record<string, unknown>)
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
  const { data, error } = await supabase
    .from('check_sheets')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  if (data) {
    return { sheet: mapRow(data as Record<string, unknown>), isNew: false }
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
    inputNotes: undefined,
    outCheck: EMPTY_CHECK_SHEET.outCheck,
    outNotes: undefined,
    inputAcquySOH: undefined,
    inputAcquySOC: undefined,
    acquySOH: undefined,
    acquySOC: undefined,
    songNungResultStatus: undefined,
    keyType: undefined,
    smartkeyStatus: undefined,
  })

  return { sheet: created, isNew: true }
}

export async function deleteCheckSheet(id: string): Promise<void> {
  const { error } = await supabase
    .from('check_sheets')
    .delete()
    .eq('id', id)

  if (error) throw error
}
