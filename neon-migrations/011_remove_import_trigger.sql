-- ============================================================
-- Migration: Remove import trigger pipeline
--
-- The application now UPSERTs directly into vehicles from the
-- frontend. No trigger or intermediate table is needed.
--
-- The table vehicles_import is left in place for compatibility
-- but is no longer used by the application.
-- ============================================================

DROP TRIGGER IF EXISTS trigger_process_import ON vehicles_import;
DROP TRIGGER IF EXISTS trg_vehicles_import ON vehicles_import;
DROP TRIGGER IF EXISTS vehicles_import_trigger ON vehicles_import;
DROP FUNCTION IF EXISTS process_vehicles_import();

-- normalize_fuel and normalize_color are no longer needed server-side.
-- They exist in the frontend (src/utils/normalizeVehicle.ts).

DROP FUNCTION IF EXISTS normalize_fuel(TEXT);
DROP FUNCTION IF EXISTS normalize_color(TEXT);
