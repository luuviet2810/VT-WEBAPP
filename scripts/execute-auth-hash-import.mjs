import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const TARGET_EMAILS = [
  'luuviet2810@gmail.com',
  'tienvietluu@gmail.com',
  'thedatjd2802@gmail.com',
  'vietluukr@gmail.com',
  'kienluu13012005vp@gmail.com',
  'nguyendinhtuan160504@gmail.com',
  'linhthu.neu@gmail.com',
];

const DEMO_EMAILS = [
  'testadmin@demo.com',
  'teststaff@demo.com',
];

async function main() {
  console.log('=== TIẾN HÀNH NHẬP PASSWORD HASH VÀO NEON POSTGRESQL ===\n');

  const csvPath = 'backups/Supabase Snippet Untitled query.csv';
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Không tìm thấy file ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
  const rows = lines.slice(1).map(l => {
    const parts = l.split(',');
    return {
      id: parts[0]?.trim(),
      email: parts[1]?.trim().toLowerCase(),
      encrypted_password: parts[2]?.trim(),
    };
  });

  console.log(`Đã đọc ${rows.length} dòng từ file CSV.`);

  // 1. Lọc và loại bỏ tài khoản demo
  const filteredRows = rows.filter(r => {
    if (DEMO_EMAILS.includes(r.email)) {
      console.log(`- Loại bỏ tài khoản demo: ${r.email}`);
      return false;
    }
    if (TARGET_EMAILS.includes(r.email)) {
      return true;
    }
    console.log(`- Bỏ qua tài khoản không thuộc danh sách mục tiêu: ${r.email}`);
    return false;
  });

  if (filteredRows.length !== TARGET_EMAILS.length) {
    throw new Error(`Số lượng tài khoản mục tiêu không khớp! Tìm thấy ${filteredRows.length}/${TARGET_EMAILS.length}`);
  }

  // 2. Kiểm tra định dạng bcrypt hash
  for (const r of filteredRows) {
    const prefix = r.encrypted_password ? r.encrypted_password.substring(0, 4) : '';
    const len = r.encrypted_password ? r.encrypted_password.length : 0;
    const isValidBcrypt = (prefix === '$2a$' || prefix === '$2b$') && len === 60;
    if (!isValidBcrypt) {
      throw new Error(`Định dạng hash không hợp lệ cho email ${r.email}: Prefix=${prefix}, Length=${len}`);
    }
  }
  console.log(`Tất cả 7 tài khoản đều có định dạng bcrypt hash chuẩn ($2a$, độ dài 60).`);

  // 3. Kết nối Neon PostgreSQL
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    // 4. Kiểm tra trước trên Neon
    const existingRes = await client.query(`
      SELECT id, auth_id, email, role, status, disabled, password_hash
      FROM users
      ORDER BY email ASC;
    `);

    const existingUsers = existingRes.rows;
    if (existingUsers.length !== 7) {
      throw new Error(`Số lượng người dùng trên Neon khác 7! Hiện có: ${existingUsers.length}`);
    }

    // 5. Đối chiếu kép ID & Email
    for (const r of filteredRows) {
      const dbUser = existingUsers.find(u => (u.email || '').trim().toLowerCase() === r.email);
      if (!dbUser) {
        throw new Error(`Không tìm thấy user ${r.email} trong database Neon`);
      }
      if (dbUser.auth_id !== r.id) {
        throw new Error(`ID không khớp cho user ${r.email}! DB auth_id=${dbUser.auth_id}, CSV id=${r.id}`);
      }
    }
    console.log(`Đối chiếu kép ID và Email thành công 100% cho cả 7 tài khoản.`);

    // 6. Bắt đầu Transaction
    console.log('\n--- BẮT ĐẦU TRANSACTION CẬP NHẬT (BEGIN) ---');
    await client.query('BEGIN;');

    let totalUpdated = 0;
    for (const r of filteredRows) {
      const dbUser = existingUsers.find(u => (u.email || '').trim().toLowerCase() === r.email);
      
      const updateRes = await client.query(`
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2 AND auth_id = $3 AND LOWER(TRIM(email)) = $4;
      `, [r.encrypted_password, dbUser.id, r.id, r.email]);

      if (updateRes.rowCount !== 1) {
        throw new Error(`Update thất bại hoặc không ảnh hưởng đúng 1 dòng cho ${r.email} (rowCount: ${updateRes.rowCount})`);
      }
      totalUpdated += updateRes.rowCount;
    }

    if (totalUpdated !== 7) {
      throw new Error(`Tổng số dòng cập nhật (${totalUpdated}) khác 7. Thực hiện ROLLBACK!`);
    }

    // 7. Kiểm tra an toàn riêng cho linhthu.neu@gmail.com
    const checkLinhThu = await client.query(`
      SELECT email, status, role, disabled, (password_hash IS NOT NULL) as has_hash
      FROM users
      WHERE email = 'linhthu.neu@gmail.com';
    `);

    const lt = checkLinhThu.rows[0];
    if (!lt || lt.status !== 'rejected') {
      throw new Error(`Vi phạm điều kiện an toàn: linhthu.neu@gmail.com không giữ nguyên status 'rejected'! Status hiện tại: ${lt?.status}`);
    }
    console.log(`Xác minh an toàn: linhthu.neu@gmail.com giữ nguyên trạng thái status = 'rejected'.`);

    // 8. Commit Transaction
    await client.query('COMMIT;');
    console.log('--- TRANSACTION HOÀN TẤT THÀNH CÔNG (COMMIT) ---\n');

    // 9. Hậu kiểm tra sau commit
    const verifyRes = await client.query(`
      SELECT 
        id, 
        auth_id, 
        email, 
        name, 
        role, 
        status, 
        disabled, 
        (password_hash IS NOT NULL AND length(password_hash) = 60) as hash_valid
      FROM users
      ORDER BY role ASC, email ASC;
    `);

    console.log('=== KẾT QUẢ XÁC MINH TRÊN NEON POSTGRESQL ===');
    console.table(verifyRes.rows.map(u => ({
      'Email': u.email,
      'Họ tên': u.name,
      'Role': u.role,
      'Status': u.status,
      'Disabled': u.disabled,
      'Password Hash Đã Nạp': u.hash_valid ? 'HỢP LỆ (60 ký tự)' : 'THIẾU',
    })));

    const countWithHash = verifyRes.rows.filter(u => u.hash_valid).length;
    console.log(`\nTổng kết: ${countWithHash}/7 tài khoản đã có password_hash hợp lệ.`);

  } catch (err) {
    console.error('\n[LỖI GIAO DỊCH] Hủy bỏ và Rollback:', err.message);
    try {
      await client.query('ROLLBACK;');
      console.log('Đã thực hiện ROLLBACK thành công. Không có dữ liệu nào bị thay đổi.');
    } catch (rbErr) {
      console.error('Lỗi khi rollback:', rbErr.message);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Lỗi ngoại lệ:', err.message);
  process.exit(1);
});
