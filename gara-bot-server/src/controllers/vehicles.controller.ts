import { Request, Response } from 'express';
import { query, getDatabasePool } from '../database/index.js';
import { deleteObject, isR2Configured, R2BucketType } from '../storage/r2.service.js';
import { normalizeDateToYYYYMMDD } from '../utils/date.js';

export function fuelTypeFromDb(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const aliases: Record<string, string> = {
    gasoline: 'Xăng',
    diesel: 'Dầu',
    lpg: 'Ga',
    hybrid: 'Hybrid',
    electric: 'Điện',
  };
  return aliases[value.trim().toLowerCase()] ?? value.trim();
}

export function mapVehicleRow(
  v: any,
  images: string[] = [],
  documents: string[] = [],
  thumbnails: Record<string, string> = {}
) {
  return {
    id: v.id,
    plate: v.plate,
    model: v.model,
    brand: v.brand ?? undefined,
    year: v.year ?? undefined,
    fuelType: fuelTypeFromDb(v.fuel_type),
    fuel_type: v.fuel_type,
    displacement: v.displacement ?? undefined,
    mileage: v.mileage ?? undefined,
    color: v.color ?? undefined,
    costPrice: v.cost_price ? Number(v.cost_price) : 0,
    cost_price: v.cost_price ? Number(v.cost_price) : 0,
    sellPrice: v.sell_price ? Number(v.sell_price) : 0,
    sell_price: v.sell_price ? Number(v.sell_price) : 0,
    status: v.status,
    positionId: v.position_id ?? null,
    position_id: v.position_id ?? null,
    assigneeId: v.assignee_id ?? null,
    assignee_id: v.assignee_id ?? null,
    note: v.note ?? '',
    images,
    thumbnails,
    documents,
    createdAt: v.created_at,
    created_at: v.created_at,
    updatedAt: v.updated_at,
    updated_at: v.updated_at,
    soldDate: v.sold_date ?? undefined,
    sold_date: v.sold_date ?? undefined,
    yardPosition: v.yard_position ?? undefined,
    yard_position: v.yard_position ?? undefined,
    imagesDeletedAt: v.images_deleted_at ?? undefined,
    songNungExpiryDate: normalizeDateToYYYYMMDD(v.song_nung_expiry_date),
    registrationExpiryDate: normalizeDateToYYYYMMDD(v.registration_expiry_date),
    isPublic: v.is_public ?? false,
    isComingSoon: v.is_coming_soon ?? false,
    is_coming_soon: v.is_coming_soon ?? false,
    publicSortOrder: v.public_sort_order ?? null,
    options: v.options ?? undefined,
    optionsChecked: v.options_checked ?? null,
  };
}

export async function getVehicles(req: Request, res: Response) {
  try {
    const { status, search } = req.query;

    let sql = 'SELECT * FROM vehicles';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(plate ILIKE $${params.length} OR model ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const [vehiclesRes, imagesRes, docsRes] = await Promise.all([
      query(sql, params),
      query(`
        SELECT vehicle_id, url, thumbnail, sort_order
        FROM vehicle_images
        WHERE category = 'vehicle' OR category IS NULL
        ORDER BY sort_order ASC
      `),
      query(`
        SELECT vehicle_id, url, sort_order
        FROM vehicle_documents
        ORDER BY sort_order ASC
      `),
    ]);

    const imagesByVehicle: Record<string, string[]> = {};
    const thumbnailsByVehicle: Record<string, Record<string, string>> = {};
    const docsByVehicle: Record<string, string[]> = {};

    for (const img of imagesRes.rows) {
      const vid = img.vehicle_id;
      if (!imagesByVehicle[vid]) imagesByVehicle[vid] = [];
      imagesByVehicle[vid].push(img.url);

      if (img.thumbnail) {
        if (!thumbnailsByVehicle[vid]) thumbnailsByVehicle[vid] = {};
        thumbnailsByVehicle[vid][img.url] = img.thumbnail;
      }
    }

    for (const doc of docsRes.rows) {
      const vid = doc.vehicle_id;
      if (!docsByVehicle[vid]) docsByVehicle[vid] = [];
      docsByVehicle[vid].push(doc.url);
    }

    const data = vehiclesRes.rows.map((row) =>
      mapVehicleRow(
        row,
        imagesByVehicle[row.id] ?? [],
        docsByVehicle[row.id] ?? [],
        thumbnailsByVehicle[row.id] ?? {}
      )
    );

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] getVehicles error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tải danh sách xe từ Neon',
    });
  }
}

export async function getVehicleById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const vehicleRes = await query('SELECT * FROM vehicles WHERE id = $1', [id]);

    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy xe',
      });
    }

    const [imagesRes, docsRes] = await Promise.all([
      query(
        `SELECT vehicle_id, url, thumbnail, sort_order FROM vehicle_images WHERE vehicle_id = $1 AND (category = 'vehicle' OR category IS NULL) ORDER BY sort_order ASC`,
        [id]
      ),
      query(
        `SELECT vehicle_id, url, sort_order FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY sort_order ASC`,
        [id]
      ),
    ]);

    const images = imagesRes.rows.map((r) => r.url);
    const thumbnails: Record<string, string> = {};
    for (const img of imagesRes.rows) {
      if (img.thumbnail) thumbnails[img.url] = img.thumbnail;
    }
    const documents = docsRes.rows.map((r) => r.url);

    const data = mapVehicleRow(vehicleRes.rows[0], images, documents, thumbnails);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] getVehicleById error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tìm thông tin xe',
    });
  }
}

export async function getVehicleByPlate(req: Request, res: Response) {
  try {
    const { plate } = req.params;
    const vehicleRes = await query(
      'SELECT * FROM vehicles WHERE plate = $1 ORDER BY created_at DESC LIMIT 1',
      [plate.trim()]
    );

    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: `Không tìm thấy xe biển số ${plate}`,
      });
    }

    const id = vehicleRes.rows[0].id;
    const [imagesRes, docsRes] = await Promise.all([
      query(
        `SELECT url, thumbnail FROM vehicle_images WHERE vehicle_id = $1 AND (category = 'vehicle' OR category IS NULL) ORDER BY sort_order ASC`,
        [id]
      ),
      query(`SELECT url FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY sort_order ASC`, [id]),
    ]);

    const images = imagesRes.rows.map((r) => r.url);
    const thumbnails: Record<string, string> = {};
    for (const img of imagesRes.rows) {
      if (img.thumbnail) thumbnails[img.url] = img.thumbnail;
    }
    const documents = docsRes.rows.map((r) => r.url);

    const data = mapVehicleRow(vehicleRes.rows[0], images, documents, thumbnails);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] getVehicleByPlate error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tìm xe theo biển số',
    });
  }
}

export async function createVehicle(req: Request, res: Response) {
  try {
    const body = req.body;
    const {
      plate,
      model,
      brand,
      year,
      fuelType,
      fuel_type,
      displacement,
      mileage,
      color,
      costPrice,
      cost_price,
      sellPrice,
      sell_price,
      status = 'available',
      positionId,
      position_id,
      assigneeId,
      assignee_id,
      note,
      yardPosition,
      yard_position,
      songNungExpiryDate,
      registrationExpiryDate,
      options,
      optionsChecked,
    } = body;

    if (!plate || !model) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: 'Biển số xe và dòng xe là bắt buộc',
      });
    }

    const targetPositionId = positionId ?? position_id ?? null;
    const targetAssigneeId = assigneeId ?? assignee_id ?? null;
    const targetCost = costPrice ?? cost_price ?? 0;
    const targetSell = sellPrice ?? sell_price ?? 0;
    const targetFuel = fuelType ?? fuel_type ?? null;
    const targetYard = yardPosition ?? yard_position ?? null;
    const targetOptions = options ? JSON.stringify(options) : null;
    const targetOptionsChecked = optionsChecked ?? false;

    const insertSql = `
      INSERT INTO vehicles (
        plate, model, brand, year, fuel_type, displacement, mileage, color,
        cost_price, sell_price, status, position_id, assignee_id, note,
        yard_position, song_nung_expiry_date, registration_expiry_date,
        options, options_checked, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, now(), now()
      )
      RETURNING *
    `;

    const values = [
      plate.trim(),
      model.trim(),
      brand ?? null,
      year ? Number(year) : null,
      targetFuel,
      displacement ?? null,
      mileage ?? null,
      color ?? null,
      Number(targetCost) || 0,
      Number(targetSell) || 0,
      status || 'available',
      targetPositionId,
      targetAssigneeId,
      note ?? '',
      targetYard,
      normalizeDateToYYYYMMDD(songNungExpiryDate),
      normalizeDateToYYYYMMDD(registrationExpiryDate),
      targetOptions,
      targetOptionsChecked,
    ];

    const result = await query(insertSql, values);
    const created = result.rows[0];

    // Log initial position movement if assigned
    if (targetPositionId) {
      const userId = req.user?.id ?? null;
      await query(
        `INSERT INTO move_logs (vehicle_id, from_position_id, to_position_id, user_id, created_at)
         VALUES ($1, NULL, $2, $3, now())`,
        [created.id, targetPositionId, userId]
      ).catch((e) => console.error('[Vehicles Controller] Move log error:', e.message));
    }

    const data = mapVehicleRow(created, [], [], {});

    return res.status(201).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] createVehicle error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể tạo mới thông tin xe',
    });
  }
}

export async function updateVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const patch = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      plate: 'plate',
      model: 'model',
      brand: 'brand',
      year: 'year',
      fuelType: 'fuel_type',
      fuel_type: 'fuel_type',
      displacement: 'displacement',
      mileage: 'mileage',
      color: 'color',
      costPrice: 'cost_price',
      cost_price: 'cost_price',
      sellPrice: 'sell_price',
      sell_price: 'sell_price',
      status: 'status',
      positionId: 'position_id',
      position_id: 'position_id',
      assigneeId: 'assignee_id',
      assignee_id: 'assignee_id',
      note: 'note',
      soldDate: 'sold_date',
      sold_date: 'sold_date',
      yardPosition: 'yard_position',
      yard_position: 'yard_position',
      songNungExpiryDate: 'song_nung_expiry_date',
      song_nung_expiry_date: 'song_nung_expiry_date',
      registrationExpiryDate: 'registration_expiry_date',
      registration_expiry_date: 'registration_expiry_date',
      isPublic: 'is_public',
      is_public: 'is_public',
      isComingSoon: 'is_coming_soon',
      is_coming_soon: 'is_coming_soon',
      publicSortOrder: 'public_sort_order',
      public_sort_order: 'public_sort_order',
      optionsChecked: 'options_checked',
      options_checked: 'options_checked',
      imagesDeletedAt: 'images_deleted_at',
      images_deleted_at: 'images_deleted_at',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (patch[key] !== undefined) {
        if (!fields.some((f) => f.startsWith(`${col} =`))) {
          let val = patch[key];
          if (col === 'year' && val !== null) val = Number(val);
          if ((col === 'cost_price' || col === 'sell_price') && val !== null) val = Number(val);
          if ((col === 'song_nung_expiry_date' || col === 'registration_expiry_date') && val !== null) {
            val = normalizeDateToYYYYMMDD(val);
          }
          values.push(val);
          fields.push(`${col} = $${values.length}`);
        }
      }
    }

    if (patch.options !== undefined) {
      values.push(patch.options ? JSON.stringify(patch.options) : null);
      fields.push(`options = $${values.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'bad_request',
        message: 'Không có trường dữ liệu nào cần cập nhật',
      });
    }

    fields.push('updated_at = now()');
    values.push(id);

    const updateSql = `
      UPDATE vehicles
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const updateRes = await query(updateSql, values);
    if (updateRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy xe để cập nhật',
      });
    }

    const updated = updateRes.rows[0];

    const [imagesRes, docsRes] = await Promise.all([
      query(
        `SELECT url, thumbnail FROM vehicle_images WHERE vehicle_id = $1 AND (category = 'vehicle' OR category IS NULL) ORDER BY sort_order ASC`,
        [id]
      ),
      query(`SELECT url FROM vehicle_documents WHERE vehicle_id = $1 ORDER BY sort_order ASC`, [id]),
    ]);

    const images = imagesRes.rows.map((r) => r.url);
    const thumbnails: Record<string, string> = {};
    for (const img of imagesRes.rows) {
      if (img.thumbnail) thumbnails[img.url] = img.thumbnail;
    }
    const documents = docsRes.rows.map((r) => r.url);

    const data = mapVehicleRow(updated, images, documents, thumbnails);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] updateVehicle error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể cập nhật thông tin xe',
    });
  }
}

export async function moveVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { toPositionId, to_position_id } = req.body;
    const targetToPositionId = toPositionId ?? to_position_id ?? null;

    const currentRes = await query('SELECT id, position_id FROM vehicles WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy xe',
      });
    }

    const current = currentRes.rows[0];
    const fromPositionId = current.position_id;

    const updateRes = await query(
      `UPDATE vehicles SET position_id = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [targetToPositionId, id]
    );

    // Ghi log di chuyển nếu vị trí thực sự thay đổi và có đích đến
    if (fromPositionId !== targetToPositionId && targetToPositionId) {
      const userId = req.user?.id ?? null;
      await query(
        `INSERT INTO move_logs (vehicle_id, from_position_id, to_position_id, user_id, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [id, fromPositionId, targetToPositionId, userId]
      ).catch((e) => console.error('[Vehicles Controller] Move log insert error:', e.message));
    }

    const updated = updateRes.rows[0];
    const data = mapVehicleRow(updated, [], [], {});

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] moveVehicle error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Không thể di chuyển vị trí xe',
    });
  }
}

interface R2CleanupTarget {
  bucketType: R2BucketType;
  key: string;
}

function extractR2KeyFromUrlOrPath(val: unknown, prefix?: string): string | null {
  if (!val || typeof val !== 'string') return null;
  const str = val.trim();
  if (!str) return null;
  if (str.startsWith('http://') || str.startsWith('https://')) {
    if (prefix) {
      const idx = str.indexOf(prefix);
      if (idx !== -1) {
        return str.substring(idx).split('?')[0].split('#')[0];
      }
    }
    const match = str.match(/(?:vehicles|documents|checksheets)\/[^?#]+/);
    if (match) return match[0];
    return null;
  }
  return str.split('?')[0].split('#')[0];
}

function collectCheckSheetPhotoKeys(rawPhotos: any): string[] {
  const keys: string[] = [];
  if (!rawPhotos) return keys;

  let parsed = rawPhotos;
  if (typeof rawPhotos === 'string') {
    try {
      parsed = JSON.parse(rawPhotos);
    } catch {
      const k = extractR2KeyFromUrlOrPath(rawPhotos, 'checksheets/');
      if (k) keys.push(k);
      return keys;
    }
  }

  function traverse(obj: any) {
    if (!obj) return;
    if (typeof obj === 'string') {
      const k = extractR2KeyFromUrlOrPath(obj, 'checksheets/');
      if (k) keys.push(k);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        traverse(item);
      }
    } else if (typeof obj === 'object') {
      for (const val of Object.values(obj)) {
        traverse(val);
      }
    }
  }

  traverse(parsed);
  return keys;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 1. Phân quyền: Chỉ Quản trị viên (Admin) mới có quyền xóa xe
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'forbidden',
        message: 'Chỉ Quản trị viên (Admin) mới có quyền xóa vĩnh viễn xe và dữ liệu liên quan.',
      });
    }

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_id',
        message: 'ID xe không hợp lệ (yêu cầu định dạng UUID).',
      });
    }

    // 2. Kiểm tra xe có tồn tại không
    const vehicleRes = await query(
      'SELECT id, plate, model FROM vehicles WHERE id = $1',
      [id]
    );
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy xe để xóa trong hệ thống.',
      });
    }

    const vehicle = vehicleRes.rows[0];

    // 3. Thu thập danh sách file lưu trữ R2 (ảnh, tài liệu, checksheet photos) TRƯỚC KHI xóa trong DB
    const [imagesRes, docsRes, checkSheetsRes] = await Promise.all([
      query('SELECT path, thumbnail FROM vehicle_images WHERE vehicle_id = $1', [id]),
      query('SELECT path FROM vehicle_documents WHERE vehicle_id = $1', [id]),
      query('SELECT exterior_photos FROM check_sheets WHERE vehicle_id = $1', [id]),
    ]);

    const r2Targets: R2CleanupTarget[] = [];

    // Keys ảnh xe
    for (const img of imagesRes.rows) {
      const origKey = extractR2KeyFromUrlOrPath(img.path, 'vehicles/');
      if (origKey) r2Targets.push({ bucketType: 'images', key: origKey });

      const thumbKey = extractR2KeyFromUrlOrPath(img.thumbnail, 'vehicles/');
      if (thumbKey) r2Targets.push({ bucketType: 'images', key: thumbKey });
    }

    // Keys tài liệu xe
    for (const doc of docsRes.rows) {
      const docKey = extractR2KeyFromUrlOrPath(doc.path, 'documents/');
      if (docKey) r2Targets.push({ bucketType: 'documents', key: docKey });
    }

    // Keys ảnh trong các phiếu kiểm tra (check_sheets)
    for (const cs of checkSheetsRes.rows) {
      const photoKeys = collectCheckSheetPhotoKeys(cs.exterior_photos);
      for (const pk of photoKeys) {
        r2Targets.push({ bucketType: 'photos', key: pk });
      }
    }

    // 4. Thực hiện xóa toàn bộ dữ liệu phụ thuộc trong 1 Database Transaction duy nhất
    const pool = getDatabasePool();
    const client = await pool.connect();

    const deletedCounts = {
      taskActivityLogs: 0,
      tasks: 0,
      checksheetLogs: 0,
      checkSheets: 0,
      vehicleImages: 0,
      vehicleDocuments: 0,
      moveLogs: 0,
      vehicleWorkflowLogs: 0,
      activityLogs: 0,
      notifications: 0,
    };

    try {
      await client.query('BEGIN');

      // 4.1. Xóa logs của các tasks thuộc xe
      const taskLogsRes = await client.query(
        `DELETE FROM task_activity_logs WHERE task_id IN (SELECT id FROM tasks WHERE vehicle_id = $1)`,
        [id]
      );
      deletedCounts.taskActivityLogs = taskLogsRes.rowCount ?? 0;

      // 4.2. Xóa toàn bộ tasks thuộc xe
      const tasksRes = await client.query(
        `DELETE FROM tasks WHERE vehicle_id = $1`,
        [id]
      );
      deletedCounts.tasks = tasksRes.rowCount ?? 0;

      // 4.3. Xóa logs của các check_sheets thuộc xe
      const csLogsRes = await client.query(
        `DELETE FROM checksheet_logs WHERE checksheet_id IN (SELECT id FROM check_sheets WHERE vehicle_id = $1)`,
        [id]
      );
      deletedCounts.checksheetLogs = csLogsRes.rowCount ?? 0;

      // 4.4. Xóa toàn bộ check_sheets thuộc xe
      const csRes = await client.query(
        `DELETE FROM check_sheets WHERE vehicle_id = $1`,
        [id]
      );
      deletedCounts.checkSheets = csRes.rowCount ?? 0;

      // 4.5. Xóa vehicle_images thuộc xe
      const imgRes = await client.query(
        `DELETE FROM vehicle_images WHERE vehicle_id = $1`,
        [id]
      );
      deletedCounts.vehicleImages = imgRes.rowCount ?? 0;

      // 4.6. Xóa vehicle_documents thuộc xe
      const docRes = await client.query(
        `DELETE FROM vehicle_documents WHERE vehicle_id = $1`,
        [id]
      );
      deletedCounts.vehicleDocuments = docRes.rowCount ?? 0;

      // 4.7. Xóa move_logs thuộc xe
      const moveRes = await client.query(
        `DELETE FROM move_logs WHERE vehicle_id = $1`,
        [id]
      );
      deletedCounts.moveLogs = moveRes.rowCount ?? 0;

      // 4.8. Xóa vehicle_workflow_logs thuộc xe
      const wfRes = await client.query(
        `DELETE FROM vehicle_workflow_logs WHERE vehicle_id = $1`,
        [id]
      );
      deletedCounts.vehicleWorkflowLogs = wfRes.rowCount ?? 0;

      // 4.9. Dọn dẹp activity_logs liên quan đến xe này
      const actRes = await client.query(
        `DELETE FROM activity_logs 
         WHERE (entity_type = 'vehicle' AND entity_id = $1)
            OR (metadata->>'vehicle_id' = $1::text)
            OR (metadata->>'vehicleId' = $1::text)`,
        [id]
      );
      deletedCounts.activityLogs = actRes.rowCount ?? 0;

      // 4.10. Dọn dẹp notifications liên quan đến xe này
      const notifRes = await client.query(
        `DELETE FROM notifications 
         WHERE (data->>'vehicle_id' = $1::text)
            OR (data->>'vehicleId' = $1::text)`,
        [id]
      );
      deletedCounts.notifications = notifRes.rowCount ?? 0;

      // 4.11. Xóa chính bản ghi xe
      await client.query(`DELETE FROM vehicles WHERE id = $1`, [id]);

      // 4.12. Ghi bản ghi audit vào activity_logs ghi nhận hành động xóa của Admin
      const adminId = req.user?.id || null;
      const auditSummary = {
        vehicleId: id,
        plate: vehicle.plate,
        model: vehicle.model,
        deletedCounts,
        deletedBy: {
          id: adminId,
          name: req.user?.name || 'Admin',
          email: req.user?.email || null,
        },
        timestamp: new Date().toISOString(),
      };

      await client.query(
        `INSERT INTO activity_logs (
          user_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent, created_at
        ) VALUES ($1, 'delete', 'vehicle', $2, $3, $4, $5, $6, NOW())`,
        [
          adminId,
          id,
          `Quản trị viên đã xóa vĩnh viễn xe ${vehicle.plate} (${vehicle.model || 'Không rõ'}) cùng toàn bộ dữ liệu lịch sử và media.`,
          JSON.stringify(auditSummary),
          req.ip || null,
          req.get('user-agent') || null,
        ]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // 5. Dọn dẹp các tệp tin trên Cloudflare R2 sau khi DB Transaction thành công
    let r2DeletedCount = 0;
    let r2ErrorsCount = 0;
    const r2Errors: Array<{ key: string; error: string }> = [];

    if (isR2Configured() && r2Targets.length > 0) {
      // Deduplicate targets theo bucketType và key
      const uniqueTargetsMap = new Map<string, R2CleanupTarget>();
      for (const target of r2Targets) {
        if (target.key) {
          uniqueTargetsMap.set(`${target.bucketType}:${target.key}`, target);
        }
      }
      const uniqueTargets = Array.from(uniqueTargetsMap.values());

      for (const item of uniqueTargets) {
        try {
          await deleteObject(item.bucketType, item.key);
          r2DeletedCount++;
        } catch (err: any) {
          r2ErrorsCount++;
          r2Errors.push({ key: item.key, error: err.message || 'Lỗi xóa file R2' });
          console.warn(`[VehicleCascadeDelete] Warning: Không thể xóa ${item.bucketType}/${item.key} từ R2:`, err.message);
        }
      }
    }

    console.log(`[VehicleCascadeDelete] Successfully deleted vehicle ${vehicle.plate} (${id}):`, {
      deletedCounts,
      r2Cleaned: r2DeletedCount,
      r2Errors: r2ErrorsCount,
    });

    return res.status(200).json({
      ok: true,
      message: `Đã xóa vĩnh viễn xe biển số ${vehicle.plate} cùng toàn bộ ${deletedCounts.checkSheets} phiếu kiểm tra, ${deletedCounts.tasks} công việc và các file liên quan thành công.`,
      data: {
        vehicleId: id,
        plate: vehicle.plate,
        deletedCounts,
        storageCleanup: {
          totalKeys: r2Targets.length,
          deletedKeys: r2DeletedCount,
          errors: r2ErrorsCount,
          errorDetails: r2Errors.length > 0 ? r2Errors : undefined,
        },
      },
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] deleteVehicle error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: err.message || 'Lỗi khi xóa xe và dữ liệu liên quan.',
    });
  }
}
