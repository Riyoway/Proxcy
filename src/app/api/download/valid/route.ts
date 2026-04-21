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
    const allIds = new Set<string>();
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('proxies')
        .select('id')
        .eq('is_valid', true)
        .order('id')
        .range(from, from + step - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach((p) => allIds.add(p.id));
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
      
      if (allIds.size >= 50000) break;
    }

    const proxyList = Array.from(allIds).join('\n');

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
