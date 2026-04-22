import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearProxies() {
  console.log('Clearing all proxies from Supabase...');
  const { error } = await supabase
    .from('proxies')
    .delete()
    .neq('id', '0'); // Delete everything where id is not '0' (which matches all)

  if (error) {
    console.error('Error clearing proxies:', error);
  } else {
    console.log('Successfully cleared all proxies.');
  }
}

clearProxies();
