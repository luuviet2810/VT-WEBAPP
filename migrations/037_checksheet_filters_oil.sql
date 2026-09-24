-- ============================================================
-- Migration: 3 trường mới cho Checksheet ĐẦU VÀO
-- ============================================================
--   cabin_air_filter  : 'clean' | 'replaced' | 'dirty'   (lọc gió trong)
--   engine_oil_level  : 'sufficient' | 'between_marks' | 'needs_topup'
--   engine_air_filter : 'clean' | 'dirty'                (lọc gió dầu máy)
--
-- Pattern hiện tại: các trường trạng thái đơn của check_sheets
-- (song_nung_result_status, undercarriage_status...) đều là TEXT nullable.
-- NULL = chưa check → xe/checksheet cũ không crash, không bị coi Bẩn/Thiếu,
-- không sinh task (rule chỉ fire khi đúng giá trị).

ALTER TABLE check_sheets
  ADD COLUMN IF NOT EXISTS cabin_air_filter  TEXT,
  ADD COLUMN IF NOT EXISTS engine_oil_level  TEXT,
  ADD COLUMN IF NOT EXISTS engine_air_filter TEXT;

NOTIFY pgrst, 'reload schema';
