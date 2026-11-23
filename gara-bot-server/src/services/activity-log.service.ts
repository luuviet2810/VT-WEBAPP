import { query } from '../database/index.js';

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'register'
  | 'check_in'
  | 'check_out'
  | 'move_vehicle'
  | 'check_sheet_in'
  | 'check_sheet_out'
  | 'approve'
  | 'reject'
  | 'enable'
  | 'disable';

export interface LogActivityParams {
  userId?: string | null;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  description?: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Ghi log hoạt động hệ thống vào bảng activity_logs trong Neon PostgreSQL
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent, created_at)
       VALUES ($1, $2::activity_action, $3, $4, $5, $6, $7, $8, now())`,
      [
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId || null,
        params.description || null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );
  } catch (err: any) {
    console.error('[ActivityLog] Lỗi khi ghi activity log:', err.message);
  }
}
