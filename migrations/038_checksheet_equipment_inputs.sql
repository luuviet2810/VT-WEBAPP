-- ============================================================
-- Migration: 4 trường thiết bị cho Checksheet ĐẦU VÀO
-- ============================================================
--   input_den_pha_cot         : 'ok' | 'error' | 'none'
--   input_motor_guong_nut_bam : 'ok' | 'error' | 'none'
--   input_cua_so              : 'ok' | 'error' | 'none'
--   input_ghe_chinh_dien      : 'ok' | 'error' | 'none'
--
-- 'error' tạo task tương ứng (rule engine); done → silent-sync về 'ok'.
-- 'ok' / 'none' không tạo task.
-- NULL = chưa check → sheet cũ không crash, không sinh task.

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS input_den_pha_cot         TEXT,
  ADD COLUMN IF NOT EXISTS input_motor_guong_nut_bam TEXT,
  ADD COLUMN IF NOT EXISTS input_cua_so              TEXT,
  ADD COLUMN IF NOT EXISTS input_ghe_chinh_dien      TEXT;

NOTIFY pgrst, 'reload schema';
