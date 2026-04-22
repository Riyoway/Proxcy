import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const country = searchParams.get('country');
  const protocol = searchParams.get('protocol');
  const google = searchParams.get('google');
  const format = searchParams.get('format') || 'ip_port'; // ip_port or protocol_ip_port

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Database configuration missing', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let query = supabase.from('proxies').select('ip, port, protocol, country_code, country_name, is_google');

  if (protocol) {
    const protocols = protocol.split(',').map(p => p.trim().toLowerCase());
    query = query.in('protocol', protocols);
  }
  
  if (google !== null) {
    const isGoogle = google.toLowerCase() === 'true' || google === '1' || google.toLowerCase() === 'yes';
    query = query.eq('is_google', isGoogle);
  }

  if (country) {
    const countries = country.split(',').map(c => c.trim());
    const orParts = countries.flatMap(c => [
      `country_code.ilike.%${c}%`,
      `country_name.ilike.%${c}%`
    ]);
    query = query.or(orParts.join(','));
  }

  // Handle potential 1000 row limits by fetching in chunks if necessary, 
  // but for a simple raw endpoint, we can use the limit parameter or just fetch up to 10000.
  // Supabase default limit is usually 1000 unless specified.
  const { data, error } = await query
    .order('checked_at', { ascending: false })
    .limit(10000);

  if (error) {
    return new Response('Error fetching proxies', { status: 500 });
  }

  if (!data || data.length === 0) {
    return new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  const rawList = data.map(p => {
    if (format === 'protocol_ip_port') {
      return `${p.protocol.toLowerCase()}://${p.ip}:${p.port}`;
    }
    return `${p.ip}:${p.port}`;
  }).join('\n');

  return new Response(rawList, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
