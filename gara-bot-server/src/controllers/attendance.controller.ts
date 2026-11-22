import { Request, Response } from 'express';
import { query } from '../database/index.js';

export function mapAttendanceRow(row: any) {
  return {
    id: row.id,
    employeeId: row.user_id,
    user_id: row.user_id,
    date: row.date,
    checkIn: row.check_in ?? null,
    check_in: row.check_in ?? null,
    checkOut: row.check_out ?? null,
    check_out: row.check_out ?? null,
    note: row.note ?? undefined,
  };
}

export async function getAttendance(req: Request, res: Response) {
  try {
    const { date, employeeId, user_id } = req.query;
    let sql = 'SELECT * FROM attendance';
    const params: any[] = [];
    const conditions: string[] = [];

    if (date && typeof date === 'string') {
      params.push(date);
      conditions.push(`date = $${params.length}`);
    }

    const targetUser = employeeId || user_id;
    if (targetUser && typeof targetUser === 'string') {
      params.push(targetUser);
      conditions.push(`user_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    const result = await query(sql, params);
    const data = result.rows.map(mapAttendanceRow);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Attendance Controller] getAttendance error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải dữ liệu chấm công',
    });
  }
}

export async function createOrUpdateAttendance(req: Request, res: Response) {
  try {
    const { employeeId, user_id, date, checkIn, check_in, checkOut, check_out, note } = req.body;
    const targetUser = employeeId ?? user_id ?? req.user?.id;
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const targetCheckIn = checkIn ?? check_in ?? null;
    const targetCheckOut = checkOut ?? check_out ?? null;

    if (!targetUser) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'employeeId là bắt buộc',
      });
    }

    const upsertSql = `
      INSERT INTO attendance (user_id, date, check_in, check_out, note, updated_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        check_in = COALESCE($3, attendance.check_in),
        check_out = COALESCE($4, attendance.check_out),
        note = COALESCE($5, attendance.note),
        updated_at = now()
      RETURNING *
    `;

    const result = await query(upsertSql, [targetUser, targetDate, targetCheckIn, targetCheckOut, note ?? null]);
    const data = mapAttendanceRow(result.rows[0]);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Attendance Controller] createOrUpdateAttendance error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật chấm công',
    });
  }
}
