-- ============================================================
-- Migration: Fix vehicles_import trigger pipeline
--
-- Drops any existing broken trigger/function and recreates
-- the complete pipeline:
--   INSERT INTO vehicles_import
--   → trigger fires
--   → process_vehicles_import() UPSERTs into vehicles
--   → fuel/color normalized automatically
--
-- Safe to re-run.
-- ============================================================

-- ====== 1. DROP EXISTING ======

DROP TRIGGER IF EXISTS trg_vehicles_import ON vehicles_import;
DROP FUNCTION IF EXISTS process_vehicles_import();

-- ====== 2. ENSURE vehicles.plate HAS A UNIQUE CONSTRAINT ======
-- Required for ON CONFLICT (plate) to work.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicles_plate_key'
    AND conrelid = 'vehicles'::regclass
  ) THEN
    ALTER TABLE vehicles ADD CONSTRAINT vehicles_plate_key UNIQUE (plate);
  END IF;
END;
$$;

-- ====== 3. MIGRATE EXISTING fuel_type TO VIETNAMESE ======

UPDATE vehicles SET fuel_type = 'Xăng' WHERE fuel_type IN ('gasoline', 'gaso', 'petrol');
UPDATE vehicles SET fuel_type = 'Dầu'  WHERE fuel_type IN ('diesel', 'dies');
UPDATE vehicles SET fuel_type = 'Ga'   WHERE fuel_type IN ('lpg', 'gas');
UPDATE vehicles SET fuel_type = 'Điện' WHERE fuel_type IN ('electric', 'ev');

-- ====== 4. UPDATE fuel_type CHECK CONSTRAINT ======

ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_fuel_type_check;

ALTER TABLE vehicles ADD CONSTRAINT vehicles_fuel_type_check
  CHECK (fuel_type IN ('Xăng', 'Dầu', 'Ga', 'Hybrid', 'Điện'));

-- ====== 4. NORMALIZATION HELPERS ======

CREATE OR REPLACE FUNCTION normalize_fuel(val TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE LOWER(TRIM(val))
    WHEN 'gasoline'  THEN 'Xăng'
    WHEN 'gaso'      THEN 'Xăng'
    WHEN 'petrol'    THEN 'Xăng'
    WHEN 'diesel'    THEN 'Dầu'
    WHEN 'dies'      THEN 'Dầu'
    WHEN 'lpg'       THEN 'Ga'
    WHEN 'gas'       THEN 'Ga'
    WHEN 'hybrid'    THEN 'Hybrid'
    WHEN 'electric'  THEN 'Điện'
    WHEN 'ev'        THEN 'Điện'
    ELSE TRIM(val)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION normalize_color(val TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE LOWER(TRIM(val))
    WHEN 'white'        THEN 'Trắng'
    WHEN 'black'        THEN 'Đen'
    WHEN 'silver'       THEN 'Bạc'
    WHEN 'dark silver'  THEN 'Xám đậm'
    WHEN 'gray'         THEN 'Xám'
    WHEN 'grey'         THEN 'Xám'
    WHEN 'blue'         THEN 'Xanh dương'
    WHEN 'red'          THEN 'Đỏ'
    WHEN 'brown'        THEN 'Nâu'
    WHEN 'gold'         THEN 'Vàng'
    WHEN 'green'        THEN 'Xanh lá'
    ELSE TRIM(val)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ====== 5. TRIGGER FUNCTION ======

CREATE OR REPLACE FUNCTION process_vehicles_import()
RETURNS TRIGGER AS $$
DECLARE
  _plate TEXT;
  _model TEXT;
  _year INTEGER;
  _fuel_type TEXT;
  _displacement TEXT;
  _mileage TEXT;
  _color TEXT;
  _cost_price BIGINT;
  _sell_price BIGINT;
  _status vehicle_status;
BEGIN
  -- ====== VALIDATE PLATE ======
  _plate := TRIM(NEW.plate);

  IF _plate IS NULL OR _plate = '' THEN
    RAISE WARNING '[vehicles_import] skipped row %: empty plate', NEW.id;
    RETURN NULL;
  END IF;

  -- ====== PREPARE FIELDS ======
  _model        := TRIM(COALESCE(NEW.model, 'Không xác định'));
  _fuel_type    := normalize_fuel(NEW.fuel_type);
  _displacement := NULLIF(TRIM(COALESCE(NEW.displacement, '')), '');
  _mileage      := NULLIF(TRIM(COALESCE(NEW.mileage, '')), '');
  _color        := normalize_color(NEW.color);

  -- Numeric fields: cast safely, return NULL on bad input
  BEGIN
    _year := NULLIF(TRIM(COALESCE(NEW.year::TEXT, '')), '')::INTEGER;
  EXCEPTION WHEN OTHERS THEN _year := NULL; END;

  BEGIN
    _cost_price := NULLIF(TRIM(COALESCE(NEW.cost_price::TEXT, '')), '')::BIGINT;
  EXCEPTION WHEN OTHERS THEN _cost_price := NULL; END;

  BEGIN
    _sell_price := NULLIF(TRIM(COALESCE(NEW.sell_price::TEXT, '')), '')::BIGINT;
  EXCEPTION WHEN OTHERS THEN _sell_price := NULL; END;

  -- Status
  BEGIN
    _status := COALESCE(
      NULLIF(TRIM(NEW.status), ''),
      'available'
    )::vehicle_status;
  EXCEPTION WHEN OTHERS THEN
    _status := 'available';
  END;

  -- ====== UPSERT ======

  INSERT INTO vehicles (
    plate, model, year, fuel_type, displacement,
    mileage, color, cost_price, sell_price, status
  ) VALUES (
    _plate, _model, _year, _fuel_type, _displacement,
    _mileage, _color, _cost_price, _sell_price, _status
  )
  ON CONFLICT (plate) DO UPDATE SET
    model       = COALESCE(vehicles.model,       EXCLUDED.model),
    year        = COALESCE(vehicles.year,         EXCLUDED.year),
    fuel_type   = COALESCE(vehicles.fuel_type,    EXCLUDED.fuel_type),
    displacement= COALESCE(vehicles.displacement, EXCLUDED.displacement),
    mileage     = COALESCE(vehicles.mileage,      EXCLUDED.mileage),
    color       = COALESCE(vehicles.color,        EXCLUDED.color),
    cost_price  = COALESCE(vehicles.cost_price,   EXCLUDED.cost_price),
    sell_price  = COALESCE(vehicles.sell_price,   EXCLUDED.sell_price),
    status      = COALESCE(vehicles.status,       EXCLUDED.status),
    updated_at  = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====== 6. TRIGGER ======

DROP TRIGGER IF EXISTS trg_vehicles_import ON vehicles_import;
CREATE TRIGGER trg_vehicles_import
  BEFORE INSERT ON vehicles_import
  FOR EACH ROW
  EXECUTE FUNCTION process_vehicles_import();
