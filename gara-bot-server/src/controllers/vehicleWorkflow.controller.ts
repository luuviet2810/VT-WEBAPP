import { Request, Response } from 'express';
import { query } from '../database/index.js';

export function mapWorkflowRow(r: any) {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    vehicle_id: r.vehicle_id,
    status: r.status,
    createdAt: r.created_at,
    created_at: r.created_at,
    createdBy: r.created_by ?? null,
    created_by: r.created_by ?? null,
  };
}

export async function getVehicleWorkflowLogs(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, vehicle_id, status, created_at, created_by
       FROM vehicle_workflow_logs
       WHERE vehicle_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    return res.status(200).json({
      ok: true,
      data: result.rows.map(mapWorkflowRow),
    });
  } catch (err: any) {
    console.error('[VehicleWorkflow Controller] getVehicleWorkflowLogs error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải lịch sử quy trình của xe',
    });
  }
}

export async function addVehicleWorkflowLog(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, createdBy } = req.body;

    if (!status) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Thiếu trạng thái quy trình',
      });
    }

    const userId = (req as any).user?.id || createdBy || null;

    const result = await query(
      `INSERT INTO vehicle_workflow_logs (vehicle_id, status, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, vehicle_id, status, created_at, created_by`,
      [id, status, userId]
    );

    return res.status(201).json({
      ok: true,
      data: mapWorkflowRow(result.rows[0]),
    });
  } catch (err: any) {
    console.error('[VehicleWorkflow Controller] addVehicleWorkflowLog error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể thêm nhật ký quy trình',
    });
  }
}
