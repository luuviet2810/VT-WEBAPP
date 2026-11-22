import { Request, Response } from 'express';
import { query } from '../database/index.js';

export function mapCheckSheetRow(row: any) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicle_id: row.vehicle_id,
    type: row.type,
    checkerId: row.checker_id ?? null,
    checker_id: row.checker_id ?? null,
    checkDate: row.check_date,
    check_date: row.check_date,
    fuelLevel: row.fuel_level,
    fuel_level: row.fuel_level,
    screen: row.screen,
    rearCamera: row.rear_camera,
    rear_camera: row.rear_camera,
    hipass: row.hipass,
    rearSensor: row.rear_sensor,
    rear_sensor: row.rear_sensor,
    dashcam: row.dashcam,
    interior: row.interior ?? {
      driverSeat: { condition: '' },
      passengerSeat: { condition: '' },
      rearSeat: { condition: '' },
    },
    exterior: row.exterior ?? {},
    exteriorPhotos: row.exterior_photos,
    exterior_photos: row.exterior_photos,
    inputDieuHoa: row.input_dieu_hoa,
    input_dieu_hoa: row.input_dieu_hoa,
    inputSuoiGhe: row.input_suoi_ghe,
    input_suoi_ghe: row.input_suoi_ghe,
    inputTireState: row.input_tire_state,
    input_tire_state: row.input_tire_state,
    inputTireInflated: row.input_tire_inflated,
    input_tire_inflated: row.input_tire_inflated,
    cabinAirFilter: row.cabin_air_filter,
    cabin_air_filter: row.cabin_air_filter,
    engineOilLevel: row.engine_oil_level,
    engine_oil_level: row.engine_oil_level,
    engineAirFilter: row.engine_air_filter,
    engine_air_filter: row.engine_air_filter,
    inputDenPhaCot: row.input_den_pha_cot,
    input_den_pha_cot: row.input_den_pha_cot,
    inputMotorGuongNutBam: row.input_motor_guong_nut_bam,
    input_motor_guong_nut_bam: row.input_motor_guong_nut_bam,
    inputCuaSo: row.input_cua_so,
    input_cua_so: row.input_cua_so,
    inputGheChinhDien: row.input_ghe_chinh_dien,
    input_ghe_chinh_dien: row.input_ghe_chinh_dien,
    outputTireInflated: row.output_tire_inflated,
    output_tire_inflated: row.output_tire_inflated,
    inputNotes: row.input_notes ?? undefined,
    input_notes: row.input_notes ?? undefined,
    outCheck: row.out_check,
    out_check: row.out_check,
    outNotes: row.out_notes ?? undefined,
    out_notes: row.out_notes ?? undefined,
    outTireState: row.out_tire_state,
    out_tire_state: row.out_tire_state,
    inputAcquySOH: row.input_acquy_soh != null ? Number(row.input_acquy_soh) : undefined,
    input_acquy_soh: row.input_acquy_soh != null ? Number(row.input_acquy_soh) : undefined,
    inputAcquySOC: row.input_acquy_soc != null ? Number(row.input_acquy_soc) : undefined,
    input_acquy_soc: row.input_acquy_soc != null ? Number(row.input_acquy_soc) : undefined,
    acquySOH: row.acquy_soh != null ? Number(row.acquy_soh) : undefined,
    acquy_soh: row.acquy_soh != null ? Number(row.acquy_soh) : undefined,
    acquySOC: row.acquy_soc != null ? Number(row.acquy_soc) : undefined,
    acquy_soc: row.acquy_soc != null ? Number(row.acquy_soc) : undefined,
    songNungResultStatus: row.song_nung_result_status,
    song_nung_result_status: row.song_nung_result_status,
    undercarriageStatus: row.undercarriage_status,
    undercarriage_status: row.undercarriage_status,
    keyType: row.key_type,
    key_type: row.key_type,
    smartkeyStatus: row.smartkey_status,
    smartkey_status: row.smartkey_status,
    outKeyType: row.out_key_type,
    out_key_type: row.out_key_type,
    outSmartkeyStatus: row.out_smartkey_status,
    out_smartkey_status: row.out_smartkey_status,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

export async function getCheckSheets(req: Request, res: Response) {
  try {
    const { vehicleId, vehicle_id, type } = req.query;

    let sql = 'SELECT * FROM check_sheets';
    const params: any[] = [];
    const conditions: string[] = [];

    const targetVehicleId = vehicleId || vehicle_id;
    if (targetVehicleId && typeof targetVehicleId === 'string') {
      params.push(targetVehicleId);
      conditions.push(`vehicle_id = $${params.length}`);
    }

    if (type && typeof type === 'string') {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    const data = result.rows.map(mapCheckSheetRow);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[CheckSheets Controller] getCheckSheets error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách phiếu kiểm tra',
    });
  }
}

export async function getCheckSheetById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM check_sheets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy phiếu kiểm tra',
      });
    }

    const data = mapCheckSheetRow(result.rows[0]);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[CheckSheets Controller] getCheckSheetById error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tìm phiếu kiểm tra',
    });
  }
}

export async function createCheckSheet(req: Request, res: Response) {
  try {
    const body = req.body;
    const vehicleId = body.vehicleId ?? body.vehicle_id;
    const type = body.type;
    const checkDate = body.checkDate ?? body.check_date ?? new Date().toISOString().slice(0, 10);
    const checkerId = body.checkerId ?? body.checker_id ?? req.user?.id ?? null;

    if (!vehicleId || !type) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'vehicleId và type là bắt buộc',
      });
    }

    // Chống tạo trùng (idempotency check):
    // 1. Nếu client truyền id và id đã tồn tại -> Chuyển thành update
    if (body.id) {
      const existingById = await query('SELECT id FROM check_sheets WHERE id = $1', [body.id]);
      if (existingById.rows.length > 0) {
        req.params.id = body.id;
        return updateCheckSheet(req, res);
      }
    }

    // 2. Nếu đã có phiếu cùng vehicle_id và type trong cùng ngày -> cập nhật phiếu đó
    const existingSameDay = await query(
      `SELECT id FROM check_sheets WHERE vehicle_id = $1 AND type = $2 AND check_date = $3 ORDER BY created_at DESC LIMIT 1`,
      [vehicleId, type, checkDate]
    );

    if (existingSameDay.rows.length > 0) {
      req.params.id = existingSameDay.rows[0].id;
      return updateCheckSheet(req, res);
    }

    // Tạo mới phiếu kiểm tra
    const insertSql = `
      INSERT INTO check_sheets (
        ${body.id ? 'id,' : ''}
        vehicle_id, type, checker_id, check_date, fuel_level,
        screen, rear_camera, hipass, rear_sensor, dashcam,
        interior, exterior, exterior_photos,
        input_dieu_hoa, input_suoi_ghe, input_tire_state, input_tire_inflated,
        cabin_air_filter, engine_oil_level, engine_air_filter,
        input_den_pha_cot, input_motor_guong_nut_bam, input_cua_so, input_ghe_chinh_dien,
        output_tire_inflated, input_notes,
        out_check, out_notes, out_tire_state,
        input_acquy_soh, input_acquy_soc, acquy_soh, acquy_soc,
        song_nung_result_status, undercarriage_status,
        key_type, smartkey_status, out_key_type, out_smartkey_status,
        created_at, updated_at
      )
      VALUES (
        ${body.id ? `$${1},` : ''}
        $${body.id ? 2 : 1}, $${body.id ? 3 : 2}, $${body.id ? 4 : 3}, $${body.id ? 5 : 4}, $${body.id ? 6 : 5},
        $${body.id ? 7 : 6}, $${body.id ? 8 : 7}, $${body.id ? 9 : 8}, $${body.id ? 10 : 9}, $${body.id ? 11 : 10},
        $${body.id ? 12 : 11}, $${body.id ? 13 : 12}, $${body.id ? 14 : 13},
        $${body.id ? 15 : 14}, $${body.id ? 16 : 15}, $${body.id ? 17 : 16}, $${body.id ? 18 : 17},
        $${body.id ? 19 : 18}, $${body.id ? 20 : 19}, $${body.id ? 21 : 20},
        $${body.id ? 22 : 21}, $${body.id ? 23 : 22}, $${body.id ? 24 : 23}, $${body.id ? 25 : 24},
        $${body.id ? 26 : 25}, $${body.id ? 27 : 26},
        $${body.id ? 28 : 27}, $${body.id ? 29 : 28}, $${body.id ? 30 : 29},
        $${body.id ? 31 : 30}, $${body.id ? 32 : 31}, $${body.id ? 33 : 32}, $${body.id ? 34 : 33},
        $${body.id ? 35 : 34}, $${body.id ? 36 : 35},
        $${body.id ? 37 : 36}, $${body.id ? 38 : 37}, $${body.id ? 39 : 38}, $${body.id ? 40 : 39},
        now(), now()
      )
      RETURNING *
    `;

    const values = [
      ...(body.id ? [body.id] : []),
      vehicleId,
      type,
      checkerId,
      checkDate,
      body.fuelLevel ?? body.fuel_level ?? null,
      body.screen ?? null,
      body.rearCamera ?? body.rear_camera ?? null,
      body.hipass ?? null,
      body.rearSensor ?? body.rear_sensor ?? null,
      body.dashcam ?? null,
      body.interior ? JSON.stringify(body.interior) : JSON.stringify({}),
      body.exterior ? JSON.stringify(body.exterior) : JSON.stringify({}),
      body.exteriorPhotos ?? body.exterior_photos ? JSON.stringify(body.exteriorPhotos ?? body.exterior_photos) : null,
      body.inputDieuHoa ?? body.input_dieu_hoa ? JSON.stringify(body.inputDieuHoa ?? body.input_dieu_hoa) : null,
      body.inputSuoiGhe ?? body.input_suoi_ghe ? JSON.stringify(body.inputSuoiGhe ?? body.input_suoi_ghe) : null,
      body.inputTireState ?? body.input_tire_state ? JSON.stringify(body.inputTireState ?? body.input_tire_state) : null,
      body.inputTireInflated ?? body.input_tire_inflated ?? null,
      body.cabinAirFilter ?? body.cabin_air_filter ?? null,
      body.engineOilLevel ?? body.engine_oil_level ?? null,
      body.engineAirFilter ?? body.engine_air_filter ?? null,
      body.inputDenPhaCot ?? body.input_den_pha_cot ?? null,
      body.inputMotorGuongNutBam ?? body.input_motor_guong_nut_bam ?? null,
      body.inputCuaSo ?? body.input_cua_so ?? null,
      body.inputGheChinhDien ?? body.input_ghe_chinh_dien ?? null,
      body.outputTireInflated ?? body.output_tire_inflated ?? null,
      body.inputNotes ?? body.input_notes ?? null,
      body.outCheck ?? body.out_check ? JSON.stringify(body.outCheck ?? body.out_check) : null,
      body.outNotes ?? body.out_notes ?? null,
      body.outTireState ?? body.out_tire_state ? JSON.stringify(body.outTireState ?? body.out_tire_state) : null,
      body.inputAcquySOH ?? body.input_acquy_soh ?? null,
      body.inputAcquySOC ?? body.input_acquy_soc ?? null,
      body.acquySOH ?? body.acquy_soh ?? null,
      body.acquySOC ?? body.acquy_soc ?? null,
      body.songNungResultStatus ?? body.song_nung_result_status ?? null,
      body.undercarriageStatus ?? body.undercarriage_status ?? null,
      body.keyType ?? body.key_type ?? null,
      body.smartkeyStatus ?? body.smartkey_status ?? null,
      body.outKeyType ?? body.out_key_type ?? null,
      body.outSmartkeyStatus ?? body.out_smartkey_status ?? null,
    ];

    const result = await query(insertSql, values);
    const data = mapCheckSheetRow(result.rows[0]);

    return res.status(201).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[CheckSheets Controller] createCheckSheet error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tạo phiếu kiểm tra',
    });
  }
}

export async function updateCheckSheet(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const patch = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, { col: string; isJson?: boolean; isNum?: boolean }> = {
      vehicleId: { col: 'vehicle_id' },
      vehicle_id: { col: 'vehicle_id' },
      type: { col: 'type' },
      checkerId: { col: 'checker_id' },
      checker_id: { col: 'checker_id' },
      checkDate: { col: 'check_date' },
      check_date: { col: 'check_date' },
      fuelLevel: { col: 'fuel_level' },
      fuel_level: { col: 'fuel_level' },
      screen: { col: 'screen' },
      rearCamera: { col: 'rear_camera' },
      rear_camera: { col: 'rear_camera' },
      hipass: { col: 'hipass' },
      rearSensor: { col: 'rear_sensor' },
      rear_sensor: { col: 'rear_sensor' },
      dashcam: { col: 'dashcam' },
      interior: { col: 'interior', isJson: true },
      exterior: { col: 'exterior', isJson: true },
      exteriorPhotos: { col: 'exterior_photos', isJson: true },
      exterior_photos: { col: 'exterior_photos', isJson: true },
      inputDieuHoa: { col: 'input_dieu_hoa', isJson: true },
      input_dieu_hoa: { col: 'input_dieu_hoa', isJson: true },
      inputSuoiGhe: { col: 'input_suoi_ghe', isJson: true },
      input_suoi_ghe: { col: 'input_suoi_ghe', isJson: true },
      inputTireState: { col: 'input_tire_state', isJson: true },
      input_tire_state: { col: 'input_tire_state', isJson: true },
      inputTireInflated: { col: 'input_tire_inflated' },
      input_tire_inflated: { col: 'input_tire_inflated' },
      cabinAirFilter: { col: 'cabin_air_filter' },
      cabin_air_filter: { col: 'cabin_air_filter' },
      engineOilLevel: { col: 'engine_oil_level' },
      engine_oil_level: { col: 'engine_oil_level' },
      engineAirFilter: { col: 'engine_air_filter' },
      engine_air_filter: { col: 'engine_air_filter' },
      inputDenPhaCot: { col: 'input_den_pha_cot' },
      input_den_pha_cot: { col: 'input_den_pha_cot' },
      inputMotorGuongNutBam: { col: 'input_motor_guong_nut_bam' },
      input_motor_guong_nut_bam: { col: 'input_motor_guong_nut_bam' },
      inputCuaSo: { col: 'input_cua_so' },
      input_cua_so: { col: 'input_cua_so' },
      inputGheChinhDien: { col: 'input_ghe_chinh_dien' },
      input_ghe_chinh_dien: { col: 'input_ghe_chinh_dien' },
      outputTireInflated: { col: 'output_tire_inflated' },
      output_tire_inflated: { col: 'output_tire_inflated' },
      inputNotes: { col: 'input_notes' },
      input_notes: { col: 'input_notes' },
      outCheck: { col: 'out_check', isJson: true },
      out_check: { col: 'out_check', isJson: true },
      outNotes: { col: 'out_notes' },
      out_notes: { col: 'out_notes' },
      outTireState: { col: 'out_tire_state', isJson: true },
      out_tire_state: { col: 'out_tire_state', isJson: true },
      inputAcquySOH: { col: 'input_acquy_soh', isNum: true },
      input_acquy_soh: { col: 'input_acquy_soh', isNum: true },
      inputAcquySOC: { col: 'input_acquy_soc', isNum: true },
      input_acquy_soc: { col: 'input_acquy_soc', isNum: true },
      acquySOH: { col: 'acquy_soh', isNum: true },
      acquy_soh: { col: 'acquy_soh', isNum: true },
      acquySOC: { col: 'acquy_soc', isNum: true },
      acquy_soc: { col: 'acquy_soc', isNum: true },
      songNungResultStatus: { col: 'song_nung_result_status' },
      song_nung_result_status: { col: 'song_nung_result_status' },
      undercarriageStatus: { col: 'undercarriage_status' },
      undercarriage_status: { col: 'undercarriage_status' },
      keyType: { col: 'key_type' },
      key_type: { col: 'key_type' },
      smartkeyStatus: { col: 'smartkey_status' },
      smartkey_status: { col: 'smartkey_status' },
      outKeyType: { col: 'out_key_type' },
      out_key_type: { col: 'out_key_type' },
      outSmartkeyStatus: { col: 'out_smartkey_status' },
      out_smartkey_status: { col: 'out_smartkey_status' },
    };

    for (const [key, mapping] of Object.entries(fieldMap)) {
      if (patch[key] !== undefined) {
        if (!fields.some((f) => f.startsWith(`${mapping.col} =`))) {
          let val = patch[key];
          if (mapping.isJson) {
            val = val != null ? JSON.stringify(val) : null;
          } else if (mapping.isNum) {
            val = val != null ? Number(val) : null;
          }
          values.push(val);
          fields.push(`${mapping.col} = $${values.length}`);
        }
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Không có dữ liệu cập nhật',
      });
    }

    fields.push('updated_at = now()');
    values.push(id);

    const updateSql = `
      UPDATE check_sheets
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await query(updateSql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy phiếu kiểm tra để cập nhật',
      });
    }

    const data = mapCheckSheetRow(result.rows[0]);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[CheckSheets Controller] updateCheckSheet error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật phiếu kiểm tra',
    });
  }
}

export async function deleteCheckSheet(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleteRes = await query('DELETE FROM check_sheets WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy phiếu kiểm tra để xóa',
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Đã xóa phiếu kiểm tra thành công',
    });
  } catch (err: any) {
    console.error('[CheckSheets Controller] deleteCheckSheet error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa phiếu kiểm tra',
    });
  }
}
