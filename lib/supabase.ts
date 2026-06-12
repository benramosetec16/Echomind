import { createClient } from '@supabase/supabase-js';

// As chaves precisam estar definidas no .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Chaves do Supabase ausentes no arquivo .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
