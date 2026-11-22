import { Request, Response } from 'express';
import { query } from '../database/index.js';

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
    songNungExpiryDate: v.song_nung_expiry_date ?? null,
    registrationExpiryDate: v.registration_expiry_date ?? null,
    isPublic: v.is_public ?? false,
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
      songNungExpiryDate ?? null,
      registrationExpiryDate ?? null,
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

export async function deleteVehicle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Kiểm tra xe có tồn tại không
    const vehicleRes = await query('SELECT id, plate FROM vehicles WHERE id = $1', [id]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        message: 'Không tìm thấy xe để xóa',
      });
    }

    // Kiểm tra các bảng nghiệp vụ có liên kết (bảo vệ lịch sử dữ liệu, không xóa cascade nhầm)
    const [checkSheetsRes, tasksRes] = await Promise.all([
      query('SELECT count(*) FROM check_sheets WHERE vehicle_id = $1', [id]),
      query('SELECT count(*) FROM tasks WHERE vehicle_id = $1', [id]),
    ]);

    const checkSheetCount = parseInt(checkSheetsRes.rows[0]?.count || '0', 10);
    const taskCount = parseInt(tasksRes.rows[0]?.count || '0', 10);

    if (checkSheetCount > 0 || taskCount > 0) {
      return res.status(400).json({
        ok: false,
        error: 'has_dependencies',
        message: `Không thể xóa xe biển số ${vehicleRes.rows[0].plate} vì đang có ${checkSheetCount} phiếu kiểm tra và ${taskCount} nhiệm vụ liên kết để bảo toàn lịch sử.`,
      });
    }

    await query('DELETE FROM vehicles WHERE id = $1', [id]);

    return res.status(200).json({
      ok: true,
      message: `Đã xóa xe biển số ${vehicleRes.rows[0].plate} thành công`,
    });
  } catch (err: any) {
    console.error('[Vehicles Controller] deleteVehicle error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: 'Lỗi khi xóa xe',
    });
  }
}
