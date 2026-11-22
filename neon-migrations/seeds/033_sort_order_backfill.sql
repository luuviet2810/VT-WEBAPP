UPDATE vehicles v
SET public_sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM vehicles
  WHERE is_public = true
    AND status <> 'sold'
    AND public_sort_order IS NULL
) AS sub
WHERE v.id = sub.id;