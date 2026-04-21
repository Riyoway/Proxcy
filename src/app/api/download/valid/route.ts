import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('proxies')
      .select('id')
      .eq('is_valid', true)
      .limit(50000);

    if (error) throw error;

    const proxyList = data.map((p) => p.id).join('\n');

    return new NextResponse(proxyList, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="valid.txt"',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate file' }, { status: 500 });
  }
}
