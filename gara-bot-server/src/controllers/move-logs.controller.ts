import { Request, Response } from 'express';
import { query } from '../database/index.js';

export function mapMoveLogRow(row: any) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicle_id: row.vehicle_id,
    fromPositionId: row.from_position_id ?? null,
    from_position_id: row.from_position_id ?? null,
    toPositionId: row.to_position_id,
    to_position_id: row.to_position_id,
    employeeId: row.user_id ?? null,
    user_id: row.user_id ?? null,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

export async function getMoveLogs(req: Request, res: Response) {
  try {
    const { vehicleId, vehicle_id } = req.query;
    const targetVehicle = vehicleId || vehicle_id;

    let sql = 'SELECT * FROM move_logs';
    const params: any[] = [];

    if (targetVehicle && typeof targetVehicle === 'string') {
      params.push(targetVehicle);
      sql += ' WHERE vehicle_id = $1 ORDER BY created_at ASC';
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    const result = await query(sql, params);
    const data = result.rows.map(mapMoveLogRow);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[MoveLogs Controller] getMoveLogs error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải lịch sử di chuyển xe',
    });
  }
}

export async function createMoveLog(req: Request, res: Response) {
  try {
    const { vehicleId, vehicle_id, fromPositionId, from_position_id, toPositionId, to_position_id, employeeId, user_id } = req.body;

    const targetVehicle = vehicleId ?? vehicle_id;
    const targetFrom = fromPositionId ?? from_position_id ?? null;
    const targetTo = toPositionId ?? to_position_id;
    const targetUser = employeeId ?? user_id ?? req.user?.id ?? null;

    if (!targetVehicle || !targetTo) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'vehicleId và toPositionId là bắt buộc',
      });
    }

    const result = await query(
      `INSERT INTO move_logs (vehicle_id, from_position_id, to_position_id, user_id, created_at)
       VALUES ($1, $2, $3, $4, now())
       RETURNING *`,
      [targetVehicle, targetFrom, targetTo, targetUser]
    );

    const data = mapMoveLogRow(result.rows[0]);
    return res.status(201).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[MoveLogs Controller] createMoveLog error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể lưu lịch sử di chuyển xe',
    });
  }
}
