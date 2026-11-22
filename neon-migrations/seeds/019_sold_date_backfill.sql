UPDATE vehicles SET sold_date = created_at::DATE WHERE status = 'sold' AND sold_date IS NULL;
