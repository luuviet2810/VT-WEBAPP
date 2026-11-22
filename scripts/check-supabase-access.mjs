import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'gara-bot-server/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- KIỂM TRA TRUY CẬP SUPABASE ---');
console.log('Supabase URL:', supabaseUrl ? 'ĐÃ CÓ (' + new URL(supabaseUrl).host + ')' : 'CHƯA CÓ');
console.log('Service Role Key:', supabaseKey ? 'ĐÃ CÓ (độ dài: ' + supabaseKey.length + ')' : 'CHƯA CÓ');

if (!supabaseUrl || !supabaseKey) {
  console.log('LỖI: Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  // 1. Lấy danh sách 7 user từ Neon để đối chiếu
  const neonPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const neonRes = await neonPool.query(`
    SELECT id, auth_id, email, name, role, status 
    FROM users 
    ORDER BY created_at ASC;
  `);
  await neonPool.end();

  const neonUsers = neonRes.rows.map(u => ({
    id: u.id,
    auth_id: u.auth_id,
    email: (u.email || '').trim().toLowerCase(),
    name: u.name,
    role: u.role,
    status: u.status,
  }));

  console.log(`\nTìm thấy ${neonUsers.length} tài khoản trong Neon.`);

  // 2. Thử truy vấn qua PostgREST schema 'auth'
  console.log('\n[Thử nghiệm 1] Truy vấn PostgREST supabase.schema("auth").from("users")...');
  try {
    const { data: authData, error: authError } = await supabase
      .schema('auth')
      .from('users')
      .select('id, email, encrypted_password');

    if (authError) {
      console.log('-> PostgREST schema "auth" thất bại:', authError.message);
    } else if (authData) {
      console.log(`-> PostgREST schema "auth" THÀNH CÔNG! Lấy được ${authData.length} bản ghi.`);
      evaluateMatches(neonUsers, authData);
      return;
    }
  } catch (err) {
    console.log('-> Lỗi ngoại lệ khi gọi schema "auth":', err.message);
  }

  // 3. Thử truy vấn qua Supabase Admin Auth API listUsers()
  console.log('\n[Thử nghiệm 2] Truy vấn supabase.auth.admin.listUsers()...');
  try {
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 100,
    });

    if (listError) {
      console.log('-> auth.admin.listUsers() thất bại:', listError.message);
    } else if (listData && listData.users) {
      console.log(`-> auth.admin.listUsers() THÀNH CÔNG! Lấy được ${listData.users.length} tài khoản từ GoTrue.`);
      
      // Kiểm tra xem User object từ GoTrue API có chứa encrypted_password không
      const sample = listData.users[0];
      const keys = sample ? Object.keys(sample) : [];
      console.log('Các trường trả về từ GoTrue Admin API:', keys.join(', '));
      const hasEncryptedPassword = sample && ('encrypted_password' in sample);
      console.log('Có chứa encrypted_password không?:', hasEncryptedPassword);

      if (!hasEncryptedPassword) {
        console.log('=> KẾT LUẬN: GoTrue Admin REST API KHÔNG trả về cột encrypted_password vì lý do bảo mật của GoTrue API.');
      }

      // Đối chiếu tài khoản theo email và auth_id
      const matched = [];
      const unmatched = [];

      for (const nu of neonUsers) {
        const found = listData.users.find(u => (u.email || '').trim().toLowerCase() === nu.email);
        if (found) {
          matched.push({
            neon_email: nu.email,
            neon_auth_id: nu.auth_id,
            supabase_id: found.id,
            id_match: nu.auth_id === found.id,
          });
        } else {
          unmatched.push(nu.email);
        }
      }

      console.log(`\nKết quả đối chiếu với danh sách GoTrue users:`);
      console.log(`- Khớp email: ${matched.length}/${neonUsers.length}`);
      matched.forEach(m => {
        console.log(`  + Email: ${m.neon_email} | ID Match: ${m.id_match ? 'ĐÚNG' : 'LỆCH'}`);
      });
      if (unmatched.length > 0) {
        console.log(`- Không khớp: ${unmatched.join(', ')}`);
      }
    }
  } catch (err) {
    console.log('-> Lỗi khi gọi auth.admin.listUsers():', err.message);
  }
}

function evaluateMatches(neonUsers, authData) {
  const matched = [];
  const unmatched = [];
  let countWithHash = 0;

  for (const nu of neonUsers) {
    const found = authData.find(u => (u.email || '').trim().toLowerCase() === nu.email);
    if (found) {
      const hasHash = Boolean(found.encrypted_password && found.encrypted_password.length > 20);
      if (hasHash) countWithHash++;
      // Check hash format prefix without revealing hash
      const prefix = found.encrypted_password ? found.encrypted_password.substring(0, 4) : 'N/A';
      matched.push({
        email: nu.email,
        auth_id_match: nu.auth_id === found.id,
        has_hash: hasHash,
        hash_prefix: prefix, // e.g. $2a$ or $2b$
      });
    } else {
      unmatched.push(nu.email);
    }
  }

  console.log(`\nKết quả kiểm tra chi tiết:`);
  console.log(`- Số tài khoản đối chiếu thành công: ${matched.length}/${neonUsers.length}`);
  console.log(`- Số tài khoản có hash: ${countWithHash}/${matched.length}`);
  matched.forEach(m => {
    console.log(`  + ${m.email}: ID khớp: ${m.auth_id_match}, Có Hash: ${m.has_hash}, Định dạng: ${m.hash_prefix}`);
  });
  if (unmatched.length > 0) {
    console.log(`- Tài khoản không tìm thấy: ${unmatched.join(', ')}`);
  }
}

run().catch(err => {
  console.error('Lỗi thực thi:', err.message);
});
