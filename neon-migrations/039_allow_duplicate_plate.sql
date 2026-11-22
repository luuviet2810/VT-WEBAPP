-- ============================================================
-- 039_allow_duplicate_plate.sql
--
-- Allow multiple vehicle records to share the same plate.
-- Vehicle identity and all operational relationships remain keyed by id.
-- This migration only removes single-column UNIQUE constraints/indexes
-- on vehicles.plate; it does not delete or modify vehicle rows.
-- ============================================================

DO $$
DECLARE
  item RECORD;
BEGIN
  -- Drop UNIQUE constraints whose only key column is plate.
  FOR item IN
    SELECT con.conname
    FROM pg_constraint AS con
    JOIN pg_attribute AS att
      ON att.attrelid = con.conrelid
     AND att.attnum = con.conkey[1]
    WHERE con.conrelid = 'public.vehicles'::regclass
      AND con.contype = 'u'
      AND cardinality(con.conkey) = 1
      AND att.attname = 'plate'
  LOOP
    EXECUTE format('ALTER TABLE public.vehicles DROP CONSTRAINT %I', item.conname);
  END LOOP;

  -- Drop standalone single-column UNIQUE indexes on plate
  -- (indexes backing constraints were already removed above).
  FOR item IN
    SELECT ns.nspname AS schema_name, idx.relname AS index_name
    FROM pg_index AS ind
    JOIN pg_class AS tbl ON tbl.oid = ind.indrelid
    JOIN pg_namespace AS ns ON ns.oid = tbl.relnamespace
    JOIN pg_class AS idx ON idx.oid = ind.indexrelid
    JOIN pg_attribute AS att
      ON att.attrelid = ind.indrelid
     AND att.attnum = ind.indkey[0]
    WHERE ind.indrelid = 'public.vehicles'::regclass
      AND ind.indisunique
      AND NOT ind.indisprimary
      AND ind.indnkeyatts = 1
      AND att.attname = 'plate'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint AS con
        WHERE con.conindid = ind.indexrelid
      )
  LOOP
    EXECUTE format('DROP INDEX %I.%I', item.schema_name, item.index_name);
  END LOOP;
END;
$$;

-- Keep lookups by plate efficient without enforcing uniqueness.
CREATE INDEX IF NOT EXISTS vehicles_plate_idx ON public.vehicles (plate);
