import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        blocked_id,
        created_at
      `)
      .eq('blocker_id', auth.sub)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked users:', error);
      return NextResponse.json({ error: 'Error al obtener bloqueados' }, { status: 500 });
    }

    const users = data?.map((item: { blocked_id: string; created_at: string }) => ({
      id: item.blocked_id,
      blockedAt: item.created_at,
    })) || [];

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Blocked users API error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
