import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const parsed = dotenv.parse(fs.readFileSync('.env'));
console.log('VITE_SUPABASE_URL:', parsed.VITE_SUPABASE_URL);

const supabase = createClient(parsed.VITE_SUPABASE_URL, parsed.VITE_SUPABASE_ANON_KEY);
try {
  const { data, error } = await supabase.from('public_vehicles').select('*').limit(5);
  console.log('Supabase public_vehicles result:', { data, error });
} catch (e) {
  console.error('Supabase exception:', e);
}
