import { Request, Response } from 'express';
import { query } from '../database/index.js';

export function mapTaskRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    priority: row.priority || 'low',
    status: row.status || 'todo',
    assigneeId: row.assignee_id ?? null,
    assignee_id: row.assignee_id ?? null,
    vehicleId: row.vehicle_id ?? null,
    vehicle_id: row.vehicle_id ?? null,
    dueDate: row.due_date ?? null,
    due_date: row.due_date ?? null,
    dueTime: row.due_time ?? null,
    due_time: row.due_time ?? null,
    ruleId: row.rule_id ?? null,
    rule_id: row.rule_id ?? null,
    source: row.source ?? null,
    deferred: Boolean(row.deferred ?? false),
    soldHandled: Boolean(row.sold_handled ?? false),
    sold_handled: Boolean(row.sold_handled ?? false),
    vehicleModelSnapshot: row.vehicle_model_snapshot ?? null,
    vehicle_model_snapshot: row.vehicle_model_snapshot ?? null,
    vehiclePlateSnapshot: row.vehicle_plate_snapshot ?? null,
    vehicle_plate_snapshot: row.vehicle_plate_snapshot ?? null,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

export function mapActivityRow(row: any) {
  return {
    id: row.id,
    taskId: row.task_id,
    task_id: row.task_id,
    action: row.action,
    employeeId: row.user_id ?? null,
    user_id: row.user_id ?? null,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

export async function getTasks(req: Request, res: Response) {
  try {
    const { status, priority, assigneeId, assignee_id, vehicleId, vehicle_id } = req.query;

    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && typeof status === 'string') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (priority && typeof priority === 'string') {
      params.push(priority);
      conditions.push(`priority = $${params.length}`);
    }

    const targetAssignee = assigneeId || assignee_id;
    if (targetAssignee && typeof targetAssignee === 'string') {
      params.push(targetAssignee);
      conditions.push(`assignee_id = $${params.length}`);
    }

    const targetVehicle = vehicleId || vehicle_id;
    if (targetVehicle && typeof targetVehicle === 'string') {
      params.push(targetVehicle);
      conditions.push(`vehicle_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    const data = result.rows.map(mapTaskRow);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] getTasks error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách nhiệm vụ',
    });
  }
}

export async function getTaskById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy nhiệm vụ',
      });
    }

    const data = mapTaskRow(result.rows[0]);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] getTaskById error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Lỗi khi tìm nhiệm vụ',
    });
  }
}

export async function createTask(req: Request, res: Response) {
  try {
    const body = req.body;
    const {
      title,
      description,
      checklist = [],
      priority = 'low',
      status = 'todo',
      assigneeId,
      assignee_id,
      vehicleId,
      vehicle_id,
      dueDate,
      due_date,
      dueTime,
      due_time,
      ruleId,
      rule_id,
      source,
      deferred = false,
      soldHandled,
      sold_handled = false,
      vehicleModelSnapshot,
      vehicle_model_snapshot,
      vehiclePlateSnapshot,
      vehicle_plate_snapshot,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'Tiêu đề nhiệm vụ là bắt buộc',
      });
    }

    const targetVehicleId = vehicleId ?? vehicle_id ?? null;
    const targetRuleId = ruleId ?? rule_id ?? null;
    const targetAssigneeId = assigneeId ?? assignee_id ?? null;
    const targetDueDate = dueDate ?? due_date ?? null;
    const targetDueTime = dueTime ?? due_time ?? null;
    const targetSoldHandled = soldHandled ?? sold_handled ?? false;
    const targetModelSnap = vehicleModelSnapshot ?? vehicle_model_snapshot ?? null;
    const targetPlateSnap = vehiclePlateSnapshot ?? vehicle_plate_snapshot ?? null;

    // Chống tạo task trùng từ rule_engine (Idempotency):
    // Nếu cùng vehicle_id và rule_id và task chưa xong (status !== 'done') -> trả về task hiện có
    if (targetVehicleId && targetRuleId) {
      const existingTask = await query(
        `SELECT * FROM tasks WHERE vehicle_id = $1 AND rule_id = $2 AND status != 'done' LIMIT 1`,
        [targetVehicleId, targetRuleId]
      );

      if (existingTask.rows.length > 0) {
        return res.status(200).json({
          ok: true,
          data: mapTaskRow(existingTask.rows[0]),
          deduplicated: true,
        });
      }
    }

    const insertSql = `
      INSERT INTO tasks (
        title, description, checklist, priority, status,
        assignee_id, vehicle_id, due_date, due_time,
        rule_id, source, deferred, sold_handled,
        vehicle_model_snapshot, vehicle_plate_snapshot,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15,
        now()
      )
      RETURNING *
    `;

    const values = [
      title.trim(),
      description ?? null,
      JSON.stringify(Array.isArray(checklist) ? checklist : []),
      priority || 'low',
      status || 'todo',
      targetAssigneeId,
      targetVehicleId,
      targetDueDate,
      targetDueTime,
      targetRuleId,
      source ?? null,
      Boolean(deferred),
      Boolean(targetSoldHandled),
      targetModelSnap,
      targetPlateSnap,
    ];

    const result = await query(insertSql, values);
    const created = result.rows[0];

    // Ghi log hoạt động
    const userId = req.user?.id ?? targetAssigneeId;
    await query(
      `INSERT INTO task_activity_logs (task_id, user_id, action, created_at) VALUES ($1, $2, $3, now())`,
      [created.id, userId, 'Tạo nhiệm vụ']
    ).catch((e) => console.error('[Tasks Controller] Activity log error:', e.message));

    const data = mapTaskRow(created);
    return res.status(201).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] createTask error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tạo nhiệm vụ',
    });
  }
}

export async function updateTask(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const patch = req.body;

    // Lấy task hiện tại để kiểm tra thay đổi status
    const currentRes = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy nhiệm vụ để cập nhật',
      });
    }
    const current = currentRes.rows[0];

    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, { col: string; isJson?: boolean; isBool?: boolean }> = {
      title: { col: 'title' },
      description: { col: 'description' },
      checklist: { col: 'checklist', isJson: true },
      priority: { col: 'priority' },
      status: { col: 'status' },
      assigneeId: { col: 'assignee_id' },
      assignee_id: { col: 'assignee_id' },
      vehicleId: { col: 'vehicle_id' },
      vehicle_id: { col: 'vehicle_id' },
      dueDate: { col: 'due_date' },
      due_date: { col: 'due_date' },
      dueTime: { col: 'due_time' },
      due_time: { col: 'due_time' },
      ruleId: { col: 'rule_id' },
      rule_id: { col: 'rule_id' },
      source: { col: 'source' },
      deferred: { col: 'deferred', isBool: true },
      soldHandled: { col: 'sold_handled', isBool: true },
      sold_handled: { col: 'sold_handled', isBool: true },
      vehicleModelSnapshot: { col: 'vehicle_model_snapshot' },
      vehicle_model_snapshot: { col: 'vehicle_model_snapshot' },
      vehiclePlateSnapshot: { col: 'vehicle_plate_snapshot' },
      vehicle_plate_snapshot: { col: 'vehicle_plate_snapshot' },
    };

    for (const [key, mapping] of Object.entries(fieldMap)) {
      if (patch[key] !== undefined) {
        if (!fields.some((f) => f.startsWith(`${mapping.col} =`))) {
          let val = patch[key];
          if (mapping.isJson) {
            val = JSON.stringify(val ?? []);
          } else if (mapping.isBool) {
            val = Boolean(val);
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

    values.push(id);

    const updateSql = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await query(updateSql, values);
    const updated = result.rows[0];

    // Ghi log hoạt động nếu đổi trạng thái
    if (patch.status && patch.status !== current.status) {
      const statusLabels: Record<string, string> = {
        todo: 'Chưa bắt đầu',
        doing: 'Đang thực hiện',
        done: 'Hoàn thành',
      };
      const label = statusLabels[patch.status] || patch.status;
      const userId = req.user?.id ?? updated.assignee_id ?? null;
      await query(
        `INSERT INTO task_activity_logs (task_id, user_id, action, created_at) VALUES ($1, $2, $3, now())`,
        [id, userId, `Đổi trạng thái: ${label}`]
      ).catch((e) => console.error('[Tasks Controller] Activity log error:', e.message));
    }

    const data = mapTaskRow(updated);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] updateTask error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật nhiệm vụ',
    });
  }
}

export async function deleteTask(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleteRes = await query('DELETE FROM tasks WHERE id = $1 RETURNING id, title', [id]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy nhiệm vụ để xóa',
      });
    }

    return res.status(200).json({
      ok: true,
      message: `Đã xóa nhiệm vụ "${deleteRes.rows[0].title}" thành công`,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] deleteTask error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể xóa nhiệm vụ',
    });
  }
}

export async function getTaskActivity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM task_activity_logs WHERE task_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const data = result.rows.map(mapActivityRow);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] getTaskActivity error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải lịch sử hoạt động nhiệm vụ',
    });
  }
}

export async function getAllTaskActivity(req: Request, res: Response) {
  try {
    const result = await query(`SELECT * FROM task_activity_logs ORDER BY created_at DESC LIMIT 500`);
    const data = result.rows.map(mapActivityRow);
    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] getAllTaskActivity error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải toàn bộ lịch sử hoạt động',
    });
  }
}

export async function addTaskActivity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, employeeId, employee_id } = req.body;

    if (!action) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'Tên hoạt động (action) là bắt buộc',
      });
    }

    const userId = employeeId ?? employee_id ?? req.user?.id ?? null;
    const result = await query(
      `INSERT INTO task_activity_logs (task_id, user_id, action, created_at)
       VALUES ($1, $2, $3, now())
       RETURNING *`,
      [id, userId, action]
    );

    const data = mapActivityRow(result.rows[0]);
    return res.status(201).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Tasks Controller] addTaskActivity error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể thêm lịch sử hoạt động',
    });
  }
}
